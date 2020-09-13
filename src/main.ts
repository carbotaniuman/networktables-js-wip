import { NetworkTableClient } from './lib/nt/client';
import { ValueId } from './lib/message/binary';

const a = new NetworkTableClient("ws://localhost:5810");
a.publish("a", ValueId.StringArray)
