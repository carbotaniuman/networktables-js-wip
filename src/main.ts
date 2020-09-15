import { NetworkTableClient } from './lib/nt/client';
const a = new NetworkTableClient("ws://localhost:5810");

(window as unknown as { a: NetworkTableClient }).a = a;
