import NetworkNode from './network';

const networkNode = new NetworkNode(process.argv[2], process.argv[3]);
networkNode.start();