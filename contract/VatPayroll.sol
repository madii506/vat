// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/*
 * vat — Friday distribution. ILLUSTRATIVE, UNAUDITED.
 * The creator share (70% of Pons v2 trade fees, received in the pair asset $GME)
 * is forwarded here and distributed every Friday 17:00 UTC to vat holders pro-rata
 * by balance at the snapshot. No treasury. No team wallet.
 */
interface IERC20 { function balanceOf(address) external view returns (uint256); function transfer(address,uint256) external returns (bool); function totalSupply() external view returns (uint256); }
contract VatPayroll {
    IERC20 public immutable VAT;      // the memecoin
    IERC20 public immutable PAY;      // $GME stock token
    uint256 public immutable epoch;   // a Friday 17:00 UTC
    mapping(uint256 => uint256) public periodPool;                   // period => amount booked
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(uint256 => bytes32) public snapshotRoot;                 // merkle root of (holder, balance) at snapshot, posted by the payday runner
    event Payday(uint256 indexed period, uint256 pool, bytes32 root);
    event Paid(address indexed who, uint256 indexed period, uint256 amount);
    constructor(IERC20 ceo, IERC20 pay, uint256 epoch_) { VAT = ceo; PAY = pay; epoch = epoch_; }
    function currentPeriod() public view returns (uint256) { return (block.timestamp - epoch) / 7 days; }
    /// @notice Runner books the closed period: pool = PAY balance received since last payday; posts snapshot root.
    function runPayday(uint256 period, bytes32 root, uint256 amount) external { require(period < currentPeriod(), "period open"); require(periodPool[period]==0, "done"); require(amount>0, "pool is empty"); periodPool[period]=amount; snapshotRoot[period]=root; emit Payday(period, amount, root); }
    /// @notice Holder claims their pro-rata share with a merkle proof of (holder, balance, totalAtSnapshot).
    function claim(uint256 period, uint256 balance, uint256 total, bytes32[] calldata proof) external {
        require(periodPool[period]>0, "not run"); require(!claimed[period][msg.sender], "paid");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, balance, total)); require(_verify(proof, snapshotRoot[period], leaf), "bad proof");
        claimed[period][msg.sender]=true; uint256 amt = periodPool[period] * balance / total; require(PAY.transfer(msg.sender, amt), "xfer"); emit Paid(msg.sender, period, amt);
    }
    function _verify(bytes32[] calldata p, bytes32 root, bytes32 leaf) internal pure returns (bool) { bytes32 h=leaf; for (uint i;i<p.length;i++){ h = h<p[i] ? keccak256(abi.encodePacked(h,p[i])) : keccak256(abi.encodePacked(p[i],h)); } return h==root; }
}
