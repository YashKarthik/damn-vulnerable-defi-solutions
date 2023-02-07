const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {
    let deployer, player, someUser;
    let token, vault, receiverContract;

    const TOKENS_IN_VAULT = 1000000n * 10n ** 18n;
    const INITIAL_PLAYER_TOKEN_BALANCE = 10n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */

        [deployer, player, someUser] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        vault = await (await ethers.getContractFactory('UnstoppableVault', deployer)).deploy(
            token.address,
            deployer.address, // owner
            deployer.address // fee recipient
        );
        expect(await vault.asset()).to.eq(token.address);

        await token.approve(vault.address, TOKENS_IN_VAULT);
        await vault.deposit(TOKENS_IN_VAULT, deployer.address);

        expect(await token.balanceOf(vault.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalAssets()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalSupply()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.maxFlashLoan(token.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.flashFee(token.address, TOKENS_IN_VAULT - 1n)).to.eq(0);
        expect(
            await vault.flashFee(token.address, TOKENS_IN_VAULT)
        ).to.eq(50000n * 10n ** 18n);

        await token.transfer(player.address, INITIAL_PLAYER_TOKEN_BALANCE);
        expect(await token.balanceOf(player.address)).to.eq(INITIAL_PLAYER_TOKEN_BALANCE);

        // Show it's possible for someUser to take out a flash loan
        receiverContract = await (await ethers.getContractFactory('ReceiverUnstoppable', someUser)).deploy(
            vault.address
        );
        await receiverContract.executeFlashLoan(100n * 10n ** 18n);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        
        /** Potential Attack One:
         * The ReceiverUnstoppable has a check to determine reject unexpected flash loans
         * if (initiator != address(this) || msg.sender != address(pool) || token != address(pool.asset()) || fee != 0)
         * fee != 0; we could try this.
         * the fee, is calculated using flashFee():
         * if (block.timestamp < end && _amount < maxFlashLoan(_token)) {
         *     return 0;
         * } else {
         *     return _amount.mulWadUp(FEE_FACTOR);
         * }
         * So if we can get the amount to be equal to maxFlashLoan of the pool, it'll give a non-zero fee.
         * But this amount is set during function call, which is called by the receiver, we cannot mess with this.
         * But what if we reduce the pool's maxFlashLoan()
         * It's calculated by calling totalASsets() which returns asset.balanceOf(address(this));
         * So if we can transfer out tokens from the pool, we could reduce the value returned by maxFlashLoan().
         */

        /** Attack that works: influence the checks run before flashLoan.
         * Of all the checks, we may only influence this one:
         * if (convertToShares(totalSupply) != balanceBefore) revert InvalidBalance(); // enforce ERC4626 requirement
            * convertToShares(totalSupply) is same as totalSupply.mulDivDown(totalSupply, asset.balanceOf(address(this)));
            * It checks (totalSupply * totalSupply) / (asset.balanceOf(address(this))) = asset.balanceOf(address(this));
            * x * x / y = y => x^2 = y^2 => x = y;
            * So the only way this flashLoan succeeds is when the num tokens of DVT and oDVT are the same.
            * We have 10 DVT ourself, we can use this to disturb x = y;
            * But we must not send the tokens via the deposit function as that would increase the size of the pie => maintaining the ratio.
            * We send using the ERC20 transfer function.
         */
            
        await token.transfer(vault.address, INITIAL_PLAYER_TOKEN_BALANCE);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // It is no longer possible to execute flash loans
        await expect(
            receiverContract.executeFlashLoan(100n * 10n ** 18n)
        ).to.be.reverted;
    });
});
