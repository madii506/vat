// vat — Friday payday runner (illustrative). Snapshots vat holders, builds a merkle tree of (holder, balance, total),
// forwards the period's $GME pool to CEOPayroll and calls runPayday(period, root, amount).  Fill RPC/keys/addresses at launch.
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, encodePacked } from 'viem'; import { privateKeyToAccount } from 'viem/accounts';
const CHAIN={ id:4663, name:'Robinhood Chain', nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:[process.env.RPC_URL||'']}} };
const A={ payroll:process.env.VAT_PAYROLL, ceo:process.env.VAT_TOKEN, gme:process.env.GME_TOKEN, treasury:process.env.TREASURY };
const abi=parseAbi(['function currentPeriod() view returns (uint256)','function periodPool(uint256) view returns (uint256)','function runPayday(uint256,bytes32,uint256)']);
const erc=parseAbi(['function balanceOf(address) view returns (uint256)','function transfer(address,uint256) returns (bool)']);
const pub=createPublicClient({chain:CHAIN,transport:http()}); const acct=process.env.PRIVATE_KEY?privateKeyToAccount(process.env.PRIVATE_KEY):null; const wallet=acct?createWalletClient({account:acct,chain:CHAIN,transport:http()}):null;
async function holders(){ /* index Transfer logs of vat to build {address: balance} — left as an exercise for the indexer */ return {}; }
function tree(leaves){ let level=leaves.slice().sort(); const layers=[level]; while(level.length>1){ const next=[]; for(let i=0;i<level.length;i+=2){ const a=level[i], b=level[i+1]||level[i]; next.push(a<b?keccak256(encodePacked(['bytes32','bytes32'],[a,b])):keccak256(encodePacked(['bytes32','bytes32'],[b,a]))); } level=next; layers.push(level);} return {root:level[0], layers}; }
(async()=>{ const cur=await pub.readContract({address:A.payroll,abi,functionName:'currentPeriod'}); const period=cur-1n; if(period<0n) return console.log('no closed period');
  if((await pub.readContract({address:A.payroll,abi,functionName:'periodPool',args:[period]}))>0n) return console.log('already run');
  const pool=await pub.readContract({address:A.gme,abi:erc,functionName:'balanceOf',args:[A.treasury]}); if(pool===0n) return console.log('pool is empty — Friday pays 0.0000 $GME, exactly as advertised');
  const H=await holders(); const total=Object.values(H).reduce((a,b)=>a+b,0n); const leaves=Object.entries(H).map(([h,b])=>keccak256(encodePacked(['address','uint256','uint256'],[h,b,total]))); const {root}=tree(leaves);
  console.log('period',period,'pool',pool,'holders',leaves.length,'root',root); if(!process.argv.includes('--send')||!wallet) return console.log('dry run');
  await wallet.writeContract({address:A.gme,abi:erc,functionName:'transfer',args:[A.payroll,pool]}); await wallet.writeContract({address:A.payroll,abi,functionName:'runPayday',args:[period,root,pool]}); console.log('payday run'); })();
