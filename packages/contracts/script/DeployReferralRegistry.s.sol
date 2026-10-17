// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamkeeperReferralRegistry} from "../src/DamkeeperReferralRegistry.sol";

/// Deploys only DamkeeperReferralRegistry with deployer as initial admin.
contract DeployReferralRegistry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        DamkeeperReferralRegistry registry = new DamkeeperReferralRegistry(deployer);

        vm.stopBroadcast();

        console.log("Deployer / admin:            ", deployer);
        console.log("DamkeeperReferralRegistry:   ", address(registry));
    }
}
