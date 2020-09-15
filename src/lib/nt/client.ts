/* eslint-disable @typescript-eslint/no-unused-vars */
import { decode, encode } from '@msgpack/msgpack';

import {
  BinaryMessage, stringId,
  Value, ValueBinaryId,
  ValueId, ValueType
} from '../message/binary';
import {
  MessageType,
  PublishRelease,
  PublishRequest, Subscribe,
  TextMessage, Unsubscribe
} from '../message/text';

export type SettableValueId = Exclude<ValueId, ValueId.Rpc>;
export type SettableValueType = ValueType;
export type SettableValue = Extract<Value,
  { type: SettableValueId; value: SettableValueType }>;

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
  published?: 'weak' | 'strong';
}

type FilledEntryData = EntryData & {
  data:
    {
      value: Value;
      timestamp: number;
    }
};

export class NetworkTableClient {
  private paths: Map<string, EntryData>;
  private topics: Map<number, EntryData>;
  private ws: WebSocket;
  private counter = 0;

  private timestampOffset = 0;

  get connected(): boolean {
    return this.timestampOffset != 0;
  }

  onerror:
    | ((this: NetworkTableClient, error: InvalidMessageError) => unknown)
    | null = null;

  constructor(url: string) {
    this.paths = new Map<string, EntryData>();
    this.topics = new Map<number, EntryData>();

    this.ws = new WebSocket(url, ['networktables.first.wpi.edu']);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onclose = () => {
      this.timestampOffset = 0;

      this.paths.forEach((value) => {
        if (value.id != undefined) {
          this.topics.delete(value.id);
          this.paths.delete(value.path);
        }

        if (value.published) {
          // invariant of `data` existing maintained by value in `published`
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value.data!.timestamp = value.published === 'weak' ? 0 : 1;
        }

        value.publishing = undefined;
        value.subuid = undefined;
        value.id = undefined;
      });
    };

    this.ws.onopen = () => {
      this.ws.send(encode(timestampMessage()));

      this.paths.forEach((v) => {
        // invariant that `value.published` and `value.data` are nonnull
        // is established by `onclose`
        const value = v as FilledEntryData;

        if (value.data.timestamp === 1) {
          value.data.timestamp = 2;
          this.sendValue(value as FilledEntryData);
        }
      });
    };

    this.ws.onmessage = (ev: MessageEvent<string | ArrayBuffer>) => {
      if (ev.data instanceof ArrayBuffer) {
        const [id, timestamp, dataType, dataValue] = decode(ev.data) as BinaryMessage;
        if (id == -1) {
          const oldOffset = this.timestampOffset;
          this.timestampOffset = (timestamp - (dataValue as number)) / 2;

          if (oldOffset == 0) {
            this.paths.forEach((v) => {
              if (v.data?.timestamp === 0 || v.data?.timestamp === 1) {
                // invariant that `value.published` and `value.data` are nonnull
                // is established by `onclose`
                const value = v as FilledEntryData;
                value.data.timestamp = timestamp;
                this.sendValue(value as FilledEntryData);
              }
            });
          }
          return;
        }

        const value = {
          type: stringId(dataType),
          value: dataValue
        } as Value;

        // we must have gotten an announcement msg already, this null assert is safe
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const topic = this.topics.get(id)!;

        if (!topic.data || topic.data.timestamp < timestamp) {
          topic.data = {
            timestamp,
            value
          };
        }
      } else {
        const msg = JSON.parse(ev.data) as TextMessage;

        switch (msg.type) {
          case MessageType.Announce: {
            const entryData = this.getOrMakeEntry(msg.data.name);
            entryData.flags = msg.data.flags;

            // we assume the id cannot change
            if (entryData.id === undefined) {
              entryData.id = msg.data.id;

              this.paths.set(msg.data.name, entryData);
              this.topics.set(msg.data.id, entryData);
            }
            break;
          }
          case MessageType.Unannounce: {
            const entryData = this.paths.get(msg.data.name);

            if (entryData !== undefined) {
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
  setValue(path: string, value: SettableValue, isDefault = false): boolean {
    const entryData = this.getOrMakeEntry(path);

    if (entryData.data) {
      if (entryData.data.value.type !== value.type) {
        return false;
      }
    }

    if(isDefault && !entryData.published) {
      entryData.published = "weak";
    } else {
      entryData.published = "strong";
    }

    if (!this.connected) {
      entryData.data = {
        value,
        timestamp: isDefault ? 0 : 1
      };
    } else {
      entryData.data = {
        value,
        timestamp: this.timestamp()
      };

      this.sendValue(entryData as FilledEntryData);
    }
    return true;
  }

  private sendValue(entry: FilledEntryData): void {
    if (!this.publishing(entry.path)) {
      this.publish(entry.path, entry.data.value.type);
    }

    this.ws.send(encode([entry.id, this.timestamp(), entry.data.value.type, entry.data.value.value]))
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
    //TODO: Stuff here

    return false;
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

    this.sendMessage(
      {
        type: MessageType.Subscribe,
        data: {
          prefixes: [path],
          subuid: this.counter++
        }
      } as Subscribe
    );

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

    this.sendMessage(
      {
        type: MessageType.Unsubscribe,
        data: {
          subuid: entryData.subuid
        }
      } as Unsubscribe
    );

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

  publish(path: string, type: ValueId): boolean {
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

    this.sendMessage(
      {
        type: MessageType.PublishRequest,
        data: {
          name: path,
          type: type
        }
      } as PublishRequest
    );

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

    this.sendMessage(
      {
        type: MessageType.PublishRelease,
        data: {
          name: path
        }
      } as PublishRelease
    );

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

  private sendMessage(msg: TextMessage): void {
    this.ws.send(JSON.stringify([msg]));
  }

  private timestamp() {
    return nowMicros() + this.timestampOffset;
  }
}

function nowMicros(): number {
  return Date.now() * 1000;
}

function timestampMessage(): BinaryMessage {
  return [-1, 0, ValueBinaryId.Integer, nowMicros()];
}

