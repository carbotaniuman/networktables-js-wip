import { ValueOf } from 'ts-essentials';

import { Value, ValueType } from '../message/binary';

import {
  NetworkTableConnection,
  SettableType,
  SettableValue,
  SettableValueType,
} from './client';

export class Entry {
  private connection: NetworkTableConnection;
  path: string;

  constructor(connection: NetworkTableConnection, path: string) {
    this.connection = connection;
    this.path = path;
  }

  setValue<T extends SettableValueType>(
    type: T,
    value: ValueOf<Pick<Extract<Value, { type: T }>, 'value'>>
  ): boolean;
  setValue(type: SettableValueType, value: SettableType): boolean {
    return this.connection.setValue(this.path, {
      type,
      value,
    } as SettableValue);
  }

  getValue<T extends SettableValueType>(
    type: T,
    defaultValue: ValueOf<Pick<Extract<Value, { type: T }>, 'value'>>
  ): ValueOf<Pick<Extract<Value, { type: T }>, 'value'>>;
  getValue(type: SettableValueType, defaultValue: SettableType): SettableType {
    return this.connection.getValue(this.path, {
      type,
      value: defaultValue,
    } as SettableValue).value;
  }

  setInteger(value: number): boolean {
    return this.setValue(ValueType.Integer, value);
  }

  setFloat(value: number): boolean {
    return this.setValue(ValueType.Float, value);
  }

  setDouble(value: number): boolean {
    return this.setValue(ValueType.Double, value);
  }

  setBoolean(value: boolean): boolean {
    return this.setValue(ValueType.Boolean, value);
  }

  setRaw(value: Uint8Array): boolean {
    return this.setValue(ValueType.Raw, value);
  }

  setString(value: string): boolean {
    return this.setValue(ValueType.String, value);
  }

  setBooleanArray(value: boolean[]): boolean {
    return this.setValue(ValueType.BooleanArray, value);
  }

  setIntegerArray(value: number[]): boolean {
    return this.setValue(ValueType.IntegerArray, value);
  }

  setFloatArray(value: number[]): boolean {
    return this.setValue(ValueType.FloatArray, value);
  }

  setDoubleArray(value: number[]): boolean {
    return this.setValue(ValueType.DoubleArray, value);
  }

  setStringArray(value: string[]): boolean {
    return this.setValue(ValueType.StringArray, value);
  }

  getInteger(value: number): number {
    return this.getValue(ValueType.Integer, value);
  }

  getFloat(defaultValue: number): number {
    return this.getValue(ValueType.Float, defaultValue);
  }

  getDouble(defaultValue: number): number {
    return this.getValue(ValueType.Double, defaultValue);
  }

  getBoolean(defaultValue: boolean): boolean {
    return this.getValue(ValueType.Boolean, defaultValue);
  }

  getRaw(defaultValue: Uint8Array): Uint8Array {
    return this.getValue(ValueType.Raw, defaultValue);
  }

  getString(defaultValue: string): string {
    return this.getValue(ValueType.String, defaultValue);
  }

  getBooleanArray(defaultValue: boolean[]): boolean[] {
    return this.getValue(ValueType.BooleanArray, defaultValue);
  }

  getIntegerArray(defaultValue: number[]): number[] {
    return this.getValue(ValueType.IntegerArray, defaultValue);
  }

  getFloatArray(defaultValue: number[]): number[] {
    return this.getValue(ValueType.FloatArray, defaultValue);
  }

  getDoubleArray(defaultValue: number[]): number[] {
    return this.getValue(ValueType.DoubleArray, defaultValue);
  }

  getStringArray(defaultValue: string[]): string[] {
    return this.getValue(ValueType.StringArray, defaultValue);
  }

  setFlags(flags: string[]): boolean {
    return this.connection.setFlags(this.path, flags);
  }

  getFlags(): string[] {
    return this.connection.getFlags(this.path);
  }

  subscribe(): void {
    return this.connection.subscribe(this.path);
  }

  unsubscribe(): void {
    return this.connection.unsubscribe(this.path);
  }

  subscribed(): boolean {
    return this.connection.subscribed(this.path);
  }

  publish(type: ValueType): boolean {
    return this.connection.publish(this.path, type);
  }

  unpublish(): boolean {
    return this.connection.unpublish(this.path);
  }

  publishing(): boolean {
    return this.connection.publishing(this.path);
  }

  exists(): boolean {
    return this.connection.exists(this.path);
  }

  //TODO: Maybe remove
  connected(): boolean {
    return this.connection.connected;
  }
}
