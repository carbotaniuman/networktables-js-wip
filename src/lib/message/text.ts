import { ValueType } from './binary';

export enum MessageType {
  PublishRequest = 'publish',
  PublishRelease = 'pubrel',
  SetFlags = 'setflags',
  Announce = 'announce',
  Unannounce = 'unannounce',
  GetValues = 'getvalues',
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
}

export type TextMessage =
  | PublishRequest
  | PublishRelease
  | SetFlags
  | Announce
  | Unannounce
  | GetValues
  | Subscribe
  | Unsubscribe;

export interface PublishRequest {
  type: MessageType.PublishRequest;
  data: {
    name: string;
    type: ValueType;
  };
}

export interface PublishRelease {
  type: MessageType.PublishRelease;
  data: {
    name: string;
  };
}

export interface SetFlags {
  type: MessageType.SetFlags;
  data: {
    name: string;
    add: string[];
    remove: string[];
  };
}

export interface SetFlags {
  type: MessageType.SetFlags;
  data: {
    name: string;
    add: string[];
    remove: string[];
  };
}

export interface Announce {
  type: MessageType.Announce;
  data: {
    name: string;
    id: number;
    type: string;
    flags: string[];
  };
}

export interface Unannounce {
  type: MessageType.Unannounce;
  data: {
    name: string;
    id: number;
  };
}

export interface GetValues {
  type: MessageType.GetValues;
  data: {
    ids: number[];
  };
}

export interface Subscribe {
  type: MessageType.Subscribe;
  data: {
    prefixes: string[];
    subuid: number;
    options: {
      immediate: boolean;
      periodic: number;
      logging: boolean;
    };
  };
}

export interface Unsubscribe {
  type: MessageType.Unsubscribe;
  data: {
    subuid: number;
  };
}
