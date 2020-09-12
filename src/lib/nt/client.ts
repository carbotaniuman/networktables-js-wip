import { BinaryMessage, ValueType } from '../message/binary';
import { MessageType, TextMessage } from '../message/text';

export type SettableValueType = Exclude<ValueType, ValueType.Rpc>
//todo: make sure rpc is excluded
export type SettableValue = Extract<ValueType, { type: SettableValueType }>

class InvalidMessageError extends Error {
  invalidMsg: TextMessage | BinaryMessage;
  constructor(message: string, invalidMsg: TextMessage | BinaryMessage) {
    super(message);
    this.invalidMsg = invalidMsg;
  }
}

export interface EntryData {
  name: string;
  id: number;
  type: string;
  flags: string[];
}

export class NetworkTableConnection {
  private paths: Map<string, number>;
  private topics: Map<number, EntryData>;
  private ws: WebSocket;

  onerror:
    | ((this: NetworkTableConnection, error: InvalidMessageError) => unknown)
    | null = null;

  constructor(url: string) {
    this.topics = new Map<number, EntryData>();

    this.ws = new WebSocket(url, ['networktables.first.wpi.edu']);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onmessage = (ev: MessageEvent<TextMessage | ArrayBuffer>) => {
      const msg = ev.data;

      if (msg instanceof ArrayBuffer) {
        //stuff goes here
      } else {
        switch (msg.type) {
          case MessageType.Announce:
            this.paths.set(msg.data.name, msg.data.id);
            this.topics.set(msg.data.id, msg.data);
            break;
          case MessageType.Unannounce: {
            this.paths.delete(msg.data.name)
            this.topics.delete(msg.data.id);
            break;
          }
          // these should never happen
          case MessageType.GetValues:
          case MessageType.Subscribe:
          case MessageType.Unsubscribe:
          case MessageType.PublishRequest:
          case MessageType.PublishRelease:
          case MessageType.SetFlags:
            if (this.onerror != null) {
              this.onerror(
                new InvalidMessageError(
                  'messages meant for server received on client',
                  msg
                )
              );
            }
        }
      }
    };
  }

  setValue(id: number, value: SettableValue) {
    // [topicId, timestamp, dataType, dataValue]
  }
}

