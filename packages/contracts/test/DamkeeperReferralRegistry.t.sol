// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamkeeperReferralRegistry} from "../src/DamkeeperReferralRegistry.sol";

contract DamkeeperReferralRegistryTest is Test {
    DamkeeperReferralRegistry registry;

    address admin = address(0xADAA);
    address scout = address(0x5C0A);
    address projectToken = address(0x70A3);

    uint256 ownerKey = 0xA11CE;
    address owner;

    bytes32 constant REFERRAL_PERMIT_TYPEHASH = keccak256(
        "ReferralPermit(address projectToken,address projectOwner,address scout,bytes32 referralIdHash,uint256 nonce,uint64 expiresAt)"
    );

    function setUp() public {
        registry = new DamkeeperReferralRegistry(admin);
        owner = vm.addr(ownerKey);
    }

    function _domainSeparator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) =
            registry.eip712Domain();
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }

    function _signPermit(DamkeeperReferralRegistry.ReferralPermit memory permit, uint256 signerKey)
        internal
        view
        returns (bytes memory)
    {
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
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // 1. Valid creator accepts referral (direct call).
    function test_AcceptReferral_Direct() public {
        bytes32 hash = keccak256("ref-1");
        vm.prank(owner);
        registry.acceptReferral(projectToken, scout, hash, uint64(block.timestamp + 30 days));

        DamkeeperReferralRegistry.Referral memory ref = registry.getActiveReferral(projectToken);
        assertEq(ref.projectOwner, owner);
        assertEq(ref.scout, scout);
        assertFalse(ref.revoked);
    }

    // 3. Signature replay fails (same nonce twice).
    function test_AcceptReferralBySig_ReplayFails() public {
        DamkeeperReferralRegistry.ReferralPermit memory permit = DamkeeperReferralRegistry.ReferralPermit({
            projectToken: projectToken,
            projectOwner: owner,
            scout: scout,
            referralIdHash: keccak256("ref-2"),
            nonce: registry.nonces(owner),
            expiresAt: uint64(block.timestamp + 1 days)
        });
        bytes memory sig = _signPermit(permit, ownerKey);

        registry.acceptReferralBySig(permit, sig);

        // Second use of the same permit/signature must fail (nonce consumed).
        vm.expectRevert();
        registry.acceptReferralBySig(permit, sig);
    }

    // 4. Expired signature fails.
    function test_AcceptReferralBySig_ExpiredFails() public {
        DamkeeperReferralRegistry.ReferralPermit memory permit = DamkeeperReferralRegistry.ReferralPermit({
            projectToken: projectToken,
            projectOwner: owner,
            scout: scout,
            referralIdHash: keccak256("ref-3"),
            nonce: registry.nonces(owner),
            expiresAt: uint64(block.timestamp) // already expired by the time it's checked
        });
        bytes memory sig = _signPermit(permit, ownerKey);

        vm.warp(block.timestamp + 1);
        vm.expectRevert(DamkeeperReferralRegistry.SignatureExpired.selector);
        registry.acceptReferralBySig(permit, sig);
    }

    // 5. Second active referral for the same project fails.
    function test_SecondActiveReferral_Fails() public {
        bytes32 hash1 = keccak256("ref-4a");
        vm.prank(owner);
        registry.acceptReferral(projectToken, scout, hash1, uint64(block.timestamp + 30 days));

        address otherScout = address(0x5C02);
        vm.prank(owner);
        vm.expectRevert(DamkeeperReferralRegistry.ActiveReferralExists.selector);
        registry.acceptReferral(projectToken, otherScout, keccak256("ref-4b"), uint64(block.timestamp + 30 days));
    }

    // 6. Valid creator revokes before conversion.
    function test_Revoke_ByOwner() public {
        bytes32 hash = keccak256("ref-5");
        vm.prank(owner);
        registry.acceptReferral(projectToken, scout, hash, uint64(block.timestamp + 30 days));

        vm.prank(owner);
        registry.revokeReferral(hash);

        DamkeeperReferralRegistry.Referral memory ref = registry.getActiveReferral(projectToken);
        assertTrue(ref.revoked);
    }

    function test_Revoke_ByNonOwnerFails() public {
        bytes32 hash = keccak256("ref-6");
        vm.prank(owner);
        registry.acceptReferral(projectToken, scout, hash, uint64(block.timestamp + 30 days));

        vm.prank(address(0xBAD));
        vm.expectRevert(DamkeeperReferralRegistry.NotProjectOwner.selector);
        registry.revokeReferral(hash);
    }

    // 7. Referral cannot be replaced (or revoked) after a verified conversion.
    function test_ConversionLocksReferral() public {
        bytes32 hash = keccak256("ref-7");
        vm.prank(owner);
        registry.acceptReferral(projectToken, scout, hash, uint64(block.timestamp + 30 days));

        vm.prank(admin);
        registry.markConverted(projectToken);

        vm.prank(owner);
        vm.expectRevert(DamkeeperReferralRegistry.ReferralLocked.selector);
        registry.revokeReferral(hash);
    }

    function test_MarkConverted_OnlyAdmin() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(DamkeeperReferralRegistry.NotAdmin.selector);
        registry.markConverted(projectToken);
    }

    function test_ZeroAddressRejected() public {
        vm.expectRevert(DamkeeperReferralRegistry.ZeroAddress.selector);
        registry.acceptReferral(address(0), scout, keccak256("ref-8"), uint64(block.timestamp + 30 days));
    }

    function test_AdminTransfer_TwoStep() public {
        address newAdmin = address(0xBEEF);
        vm.prank(admin);
        registry.initiateAdminTransfer(newAdmin);
        assertEq(registry.admin(), admin); // unchanged until accepted

        vm.prank(newAdmin);
        registry.acceptAdminTransfer();
        assertEq(registry.admin(), newAdmin);
    }
}
