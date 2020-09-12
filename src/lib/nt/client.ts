import {
  BinaryMessage,
  defaultValue,
  Value,
  ValueType
} from '../message/binary';
import {
  MessageType,
  PublishRelease,
  PublishRequest, Subscribe,
  TextMessage, Unsubscribe
} from '../message/text';

export type SettableValueType = Exclude<ValueType, ValueType.Rpc>;
export type SettableType =
  | string
  | number
  | boolean
  | Uint8Array
  | boolean[]
  | number[]
  | string[];
export type SettableValue = Extract<Value,
  { type: SettableValueType; value: SettableType }>;

class InvalidMessageError extends Error {
  invalidMsg: TextMessage | BinaryMessage;

  constructor(message: string, invalidMsg: TextMessage | BinaryMessage) {
    super(message);
    this.invalidMsg = invalidMsg;
  }
}

interface EntryData {
  path: string;

  id?: number;
  data?:
    {
      value: Value;
      timestamp: number;
    }
  flags?: string[];


  subuid?: number;
  publishing?: true;
  published?: true;
}

export class NetworkTableConnection {
  private paths: Map<string, EntryData>;
  private topics: Map<number, EntryData>;
  private ws: WebSocket;
  private counter = 0;

  private _connected: boolean = false;
  get connected(): boolean {
    return this._connected;
  }

  onerror:
    | ((this: NetworkTableConnection, error: InvalidMessageError) => unknown)
    | null = null;

  constructor(url: string) {
    this.paths = new Map<string, EntryData>();
    this.topics = new Map<number, EntryData>();

    this.ws = new WebSocket(url, ['networktables.first.wpi.edu']);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onmessage = (ev: MessageEvent<string | ArrayBuffer>) => {

      if (ev.data instanceof ArrayBuffer) {
        //stuff goes here
      } else {
        const msg = JSON.parse(ev.data) as TextMessage;

        switch (msg.type) {
          case MessageType.Announce: {
            const entryData: EntryData = {
              path: msg.data.name,
              id: msg.data.id,
              data: {
                value: defaultValue(msg.data.type),
                timestamp: 0,
                flags: msg.data.flags
              }
            };
            this.paths.set(msg.data.name, entryData);
            this.topics.set(msg.data.id, entryData);
            break;
          }
          case MessageType.Unannounce: {
            const entryData = this.paths.get(msg.data.name);

            if(entryData !== undefined) {
              this.paths.delete(msg.data.name);
              this.topics.delete(msg.data.id);

              entryData.id = undefined;
            }
            break;
          }
          default:
            if (this.onerror != null) {
              this.onerror(
                new InvalidMessageError(
                  'messages meant for server received on client',
                  msg
                )
              );
            }
            break;
        }
      }
    };
  }

  private getOrMakeEntry(path: string): EntryData {
    let entryData = this.paths.get(path);
    if (entryData === undefined) {
      entryData = {
        path: path
      };
      this.paths.set(path, entryData);
    }
    return entryData;
  }

  // implementation detail - do not use unless you accept breakage
  setValue(path: string, value: SettableValue, isDefault: boolean = false): boolean {
    const entryData = this.getOrMakeEntry(path);

    if (!this.connected) {
      if (!('data' in entryData)) {
        entryData.data = {
          value,
          timestamp: isDefault ? 0 : 1,
        };
      }
    } else {
      if (!this.publishing(path)) {
        this.publish(path, value.type);
      }

      // send binary frame
    }
  }

  getValue(path: string, defaultValue: SettableValue): SettableValue {
    const entryData = this.getOrMakeEntry(path);

    if (!this.subscribed(path)) {
      this.subscribe(path);
    }

    if (!entryData.data?.value) {
      return defaultValue;
    }

    if (entryData.data.value.type !== defaultValue.type) {
      return defaultValue;
    }

    return entryData.data.value;
  }

  setFlags(path: string, flags: string[]): boolean {

  }

  getFlags(path: string): string[] {
    const entryData = this.getOrMakeEntry(path);

    if (!this.subscribed(path)) {
      this.subscribe(path);
    }

    if (entryData.flags) {
      return entryData.flags;
    }

    return [];
  }

  subscribe(path: string): boolean {
    const entryData = this.getOrMakeEntry(path);
    if (entryData.subuid) {
      return true;
    }

    if (!this.connected) {
      return false;
    }

    this.ws.send(JSON.stringify(
      {
        type: MessageType.Subscribe,
        data: {
          prefixes: [path],
          subuid: this.counter++
        }
      } as Subscribe
    ));

    return true;
  }

  unsubscribe(path: string): boolean {
    const entryData = this.paths.get(path);
    if (entryData === undefined) {
      return false;
    }

    if (!entryData.subuid) {
      return true;
    }

    this.ws.send(JSON.stringify(
      {
        type: MessageType.Unsubscribe,
        data: {
          subuid: entryData.subuid
        }
      } as Unsubscribe
    ));

    entryData.subuid = undefined;

    return true;
  }

  subscribed(path: string): boolean {
    const entryData = this.paths.get(path);
    if (entryData === undefined) {
      return false;
    }
    return entryData.subuid !== undefined;
  }

  publish(path: string, type: ValueType): boolean {
    const entryData = this.getOrMakeEntry(path);
    if (entryData.publishing) {
      return true;
    }

    if (!this.connected) {
      return false;
    }

    if (entryData.data?.value.type !== type) {
      return false;
    }

    this.ws.send(JSON.stringify(
      {
        type: MessageType.PublishRequest,
        data: {
          name: path,
          type: type
        }
      } as PublishRequest
    ));

    return true;
  }

  unpublish(path: string): boolean {
    const entryData = this.paths.get(path);
    if (entryData === undefined) {
      return false;
    }
    if (!entryData.publishing) {
      return true;
    }

    this.ws.send(JSON.stringify(
      {
        type: MessageType.PublishRelease,
        data: {
          name: path
        }
      } as PublishRelease
    ));

    entryData.publishing = undefined;
    return true;
  }

  publishing(path: string): boolean {
    const entryData = this.paths.get(path);
    if (entryData === undefined) {
      return false;
    }
    return entryData.publishing ?? false;
  }

  private timestamp() {
  }
}

const I32_MIN = -2147483648;
const I32_MAX = 2147483647;

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}
