import { 
    BLOCKCHAIN, 
    createNewBlock, 
    creatNewTransaction, 
    hashBlock,
    proofOfWork
} from './blockchain';

const mandracoin = { ...BLOCKCHAIN() };

console.log(mandracoin);