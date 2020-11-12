const {
  BN,           // Big Number support
  time
} = require('@openzeppelin/test-helpers');

const DutchSwapAuction = artifacts.require("DutchSwapAuction");
const DutchSwapFactory = artifacts.require("DutchSwapFactory");
const MockERC20 = artifacts.require("MockERC20");
const MockPriceOracle = artifacts.require("MockPriceOracle");
const AuctionManager = artifacts.require("AuctionManager");

const ONE = new BN('1000000000000000000');

contract("AuctionManager", (accounts) => {
  let alice = accounts[0];
  let bob = accounts[1];
  let auctionTemplate;
  let factory;
  let strudel;
  let vBtc;
  let btcPriceOracle;
  let vBtcPriceOracle;
  let strudelPriceOracle;
  let auctionManager;

  beforeEach(async () => {
    auctionTemplate = await DutchSwapAuction.new();
    factory = await DutchSwapFactory.new();
    await factory.initDutchSwapFactory(auctionTemplate.address, 0);
    strudel = await MockERC20.new('strudel', '$TRDL', new BN('200000').mul(ONE), {from: alice});
    vBtc = await MockERC20.new('vBtc', 'vBTC', new BN('10').mul(ONE), {from: bob});
    btcPriceOracle = await MockPriceOracle.new();
    vBtcPriceOracle = await MockPriceOracle.new();
    strudelPriceOracle = await MockPriceOracle.new();
    auctionManager = await AuctionManager.new(
      strudel.address,
      vBtc.address,
      btcPriceOracle.address,
      vBtcPriceOracle.address,
      strudelPriceOracle.address,
      factory.address
    );
  });

  it("should allow to start auction", async () => {

    // start an auction that buys vBTC
    // BTC price is over vBTC price
    await btcPriceOracle.update('32000000');
    await vBtcPriceOracle.update('20000000');
    await strudelPriceOracle.update('200');
    await auctionManager.rotateAuctions();
    const auction = await DutchSwapAuction.at((await auctionManager.currentAuction()));

    // participate in vBTC buy auction
    await time.increase((60 * 60 * 11) + (60 * 45));
    await vBtc.approve(auction.address, new BN('100').mul(ONE), {from: bob});
    await auction.commitTokens(ONE, {from: bob});

    // rotate into an auction that sells vBTC
    await time.increase((60 * 60 * 12));
    await vBtcPriceOracle.update('40000000');

    // check results of previous auction
    // vBTC Amount: 0.0002 / 20 = 0.00001
    // at about half the time, the price should be ~0.014
    let bal = await vBtc.balanceOf(auction.address);
    assert.equal(bal.divRound(new BN('100000000000000')).toString(), '140');
    await auctionManager.rotateAuctions();
    const auction2 = await DutchSwapAuction.at((await auctionManager.currentAuction()));
 
    // check results of buy auction
    await auction.withdrawTokens({from: bob});
    // outstanding supply: 10 vBTC
    // imbalance in ETH: (32 - 20) * 10 = 120 ETH
    // imbalance in $TRDL: 120 ETH / 0.0002 = 600,000 $TRDL
    // dillution bound: 200,000 * 0.007 = 1,400 $TRDL
    bal = await strudel.balanceOf(bob);
    assert.equal(bal.toString(), '1400000000000000000000');

    // participate in vBTC sell auction
    await time.increase((60 * 60 * 11) + (60 * 45));
    // outstanding supply: 10 - 0.014 = 9.986 vBTC
    // imbalance in ETH: (40 - 32) * 9.986 = 79.888 ETH
    // imbalance in $TRDL: 120 ETH / 0.0002 = 399,440 $TRDL
    // dillution bound: 201,400 * 0.007 = 1,409.8 $TRDL    
    await strudel.approve(auction2.address, new BN('1410').mul(ONE), {from: alice});
    await auction2.commitTokens(new BN('1410').mul(ONE), {from: alice});
    bal = await strudel.balanceOf(auction2.address);
    console.log('auction: ', bal.toString());
    assert.equal(bal.divRound(ONE).toString(), '1410');
    

    // rotate into an auction that sells vBTC
    await time.increase(60 * 60 * 12);
    await auctionManager.rotateAuctions();

    // check results
    await auction2.withdrawTokens({from: alice});
    // vBTC Amount: 0.0002 / 40 = 0.000005
    // at about half the time, the price should be
    // 0.000005 * 1410 = ~0.00705
    bal = await vBtc.balanceOf(alice);
    assert.equal(bal.divRound(new BN('10000000000000')).toString(), '705');
    console.log('alice: ', bal.toString());
  });

  // TODO: manually finalize auction, then call rotate
  it("should allow to manually finalize auction", async () => {

  });
});