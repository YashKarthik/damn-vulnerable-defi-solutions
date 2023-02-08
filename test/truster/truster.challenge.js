const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, player;
    let token, pool;

    const TOKENS_IN_POOL = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        pool = await (await ethers.getContractFactory('TrusterLenderPool', deployer)).deploy(token.address);
        expect(await pool.token()).to.eq(token.address);

        await token.transfer(pool.address, TOKENS_IN_POOL);
        expect(await token.balanceOf(pool.address)).to.equal(TOKENS_IN_POOL);

        expect(await token.balanceOf(player.address)).to.equal(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        /** Attempt 1 - failed
         * The only check in the entire process is that the balance before and after the flashLoan are the same.
         * It uses token.balanceOf(address(this)) to store the value before the flashloan, then checks balance after loan against that.
         * How can we influence that?
         * DELEGATCALL!!!
         * We call the floashLoan from our own contract using delegatecall.
         * So when it reads token.balanceOf(address(this)), the address will be our contract => no tokens.
         * But then what happen when we come to the token.transfer(borrower, amount); line?
         */
            
        /** Attempt 2
         * Use the target.functionCall(data); line to ERC20().approve my contract to withdraw all the funds.
         * After repaying the flashloan, call the ERC20().transferFrom function.
         */
        const attacker = await (await ethers.getContractFactory('AttackTruster', player)).deploy(pool.address, token.address);
        await attacker.attack();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await token.balanceOf(pool.address)
        ).to.equal(0);
    });
});

