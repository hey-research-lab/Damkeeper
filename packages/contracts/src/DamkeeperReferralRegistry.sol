// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @notice Records creator-approved Scout referral attribution onchain, per
/// brief section 12.1. No token custody, no upgrade path. The contract does
/// NOT verify that the accepting wallet is the project's real deployer —
/// that check happens offchain (the indexer cross-references the launch
/// indexer's recorded creator address). This contract only records who
/// accepted what, when, and blocks replay/duplication.
/// @dev Two-step admin transfer mirrors DamkeeperLockManager. Not audited.
contract DamkeeperReferralRegistry is EIP712, Nonces {
    struct Referral {
        address projectToken;
        address projectOwner;
        address scout;
        bytes32 referralIdHash;
        uint64 acceptedAt;
        uint64 expiresAt;
        bool revoked;
    }

    struct ReferralPermit {
        address projectToken;
        address projectOwner;
        address scout;
        bytes32 referralIdHash;
        uint256 nonce;
        uint64 expiresAt;
    }

    bytes32 private constant REFERRAL_PERMIT_TYPEHASH = keccak256(
        "ReferralPermit(address projectToken,address projectOwner,address scout,bytes32 referralIdHash,uint256 nonce,uint64 expiresAt)"
    );

    address public admin;
    address public pendingAdmin;

    mapping(address => Referral) private _activeReferral; // projectToken => current referral
    mapping(bytes32 => address) private _tokenByHash; // referralIdHash => projectToken, for revoke-by-hash
    mapping(address => bool) public hasVerifiedConversion; // projectToken => locked after a conversion

    event ReferralAccepted(
        bytes32 indexed referralIdHash,
        address indexed projectToken,
        address indexed scout,
        address projectOwner,
        uint64 expiresAt
    );
    event ReferralRevoked(
        bytes32 indexed referralIdHash, address indexed projectToken, address indexed projectOwner
    );
    event ConversionLocked(address indexed projectToken, address actor);
    event AdminTransferInitiated(address indexed previousAdmin, address indexed pendingAdmin);
    event AdminTransferAccepted(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin();
    error ZeroAddress();
    error SignatureExpired();
    error ActiveReferralExists();
    error ReferralLocked();
    error NotProjectOwner();
    error ReferralNotFound();
    error InvalidSignature();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address initialAdmin) EIP712("DamkeeperReferralRegistry", "1") {
        if (initialAdmin == address(0)) revert ZeroAddress();
        admin = initialAdmin;
    }

    /// @notice Project creator accepts a referral directly (msg.sender is the project owner).
    function acceptReferral(address projectToken, address scout, bytes32 referralIdHash, uint64 expiresAt)
        external
    {
        _accept(projectToken, msg.sender, scout, referralIdHash, expiresAt);
    }

    /// @notice Accept on behalf of a signer via EIP-712 (meta-tx path, so the
    /// project creator doesn't need gas or to submit the tx themselves).
    function acceptReferralBySig(ReferralPermit calldata permit, bytes calldata signature) external {
        if (block.timestamp > permit.expiresAt) revert SignatureExpired();

        bytes32 structHash = keccak256(
            abi.encode(
                REFERRAL_PERMIT_TYPEHASH,
                permit.projectToken,
                permit.projectOwner,
                permit.scout,
                permit.referralIdHash,
                permit.nonce,
                permit.expiresAt
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (signer != permit.projectOwner) revert InvalidSignature();

        _useCheckedNonce(permit.projectOwner, permit.nonce);

        _accept(permit.projectToken, permit.projectOwner, permit.scout, permit.referralIdHash, permit.expiresAt);
    }

    function _accept(
        address projectToken,
        address projectOwner,
        address scout,
        bytes32 referralIdHash,
        uint64 expiresAt
    ) private {
        if (projectToken == address(0) || scout == address(0)) revert ZeroAddress();
        if (hasVerifiedConversion[projectToken]) revert ReferralLocked();

        Referral storage existing = _activeReferral[projectToken];
        bool stillActive = existing.projectToken != address(0) && !existing.revoked
            && existing.expiresAt > block.timestamp;
        if (stillActive) revert ActiveReferralExists();

        _activeReferral[projectToken] = Referral({
            projectToken: projectToken,
            projectOwner: projectOwner,
            scout: scout,
            referralIdHash: referralIdHash,
            acceptedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revoked: false
        });
        _tokenByHash[referralIdHash] = projectToken;

        emit ReferralAccepted(referralIdHash, projectToken, scout, projectOwner, expiresAt);
    }

    /// @notice Only the recorded project owner may revoke their own referral.
    function revokeReferral(bytes32 referralIdHash) external {
        address projectToken = _tokenByHash[referralIdHash];
        if (projectToken == address(0)) revert ReferralNotFound();

        Referral storage ref = _activeReferral[projectToken];
        if (ref.projectOwner != msg.sender) revert NotProjectOwner();
        if (hasVerifiedConversion[projectToken]) revert ReferralLocked();

        ref.revoked = true;
        emit ReferralRevoked(referralIdHash, projectToken, ref.projectOwner);
    }

    function getActiveReferral(address projectToken) external view returns (Referral memory) {
        return _activeReferral[projectToken];
    }

    /// @notice Called by the backend rules engine once a referral's conversion
    /// is verified, per brief section 8 rule 7: "Referral cannot be replaced
    /// after a verified conversion." Irreversible by design.
    function markConverted(address projectToken) external onlyAdmin {
        hasVerifiedConversion[projectToken] = true;
        emit ConversionLocked(projectToken, msg.sender);
    }

    // ---- Admin: two-step transfer only. No pause, no upgrade, no fund custody. ----

    function initiateAdminTransfer(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    function acceptAdminTransfer() external {
        if (msg.sender != pendingAdmin) revert NotAdmin();
        emit AdminTransferAccepted(admin, msg.sender);
        admin = msg.sender;
        pendingAdmin = address(0);
    }
}
