import { UnreachableCaseError, ValueOf } from 'ts-essentials';

import { Value, ValueType } from '../message/binary';

import { NetworkTableConnection, SettableValueType } from './client';


class Entry {
  connection: NetworkTableConnection;
  path: string;
  id: number;

  setValue<T extends SettableValueType>(
    type: T,
    value: ValueOf<Pick<Extract<Value, { type: T }>, "value">>
  ): void;
  setValue(type: SettableValueType, value: string | number | boolean | Uint8Array | boolean[] | number[] | string[]): void {
    switch (type) {
      case ValueType.Integer:
        this.setInteger(value as number); break;
      case ValueType.Float:
        this.setFloat(value as number); break;
      case ValueType.Double:
        this.setDouble(value as number); break;
      case ValueType.Boolean:
        this.setBoolean(value as boolean); break;
      case ValueType.Raw:
        this.setRaw(value as Uint8Array); break;
      case ValueType.String:
        this.setString(value as string); break;
      case ValueType.BooleanArray:
        this.setBooleanArray(value as boolean[]); break;
      case ValueType.IntegerArray:
        this.setIntegerArray(value as number[]); break;
      case ValueType.FloatArray:
        this.setFloatArray(value as number[]); break;
      case ValueType.DoubleArray:
        this.setDoubleArray(value as number[]); break;
      case ValueType.StringArray:
        this.setStringArray(value as string[]); break;
      default:
        throw new UnreachableCaseError(type);
    }
  }

  setInteger(value: number): boolean {

  }

  setFloat(value: number): boolean {

  }

  setDouble(value: number): boolean {

  }

  setBoolean(value: boolean): boolean {

  }

  setRaw(value: Uint8Array): boolean {

  }

  setString(value: string): boolean {

  }

  setBooleanArray(value: boolean[]): boolean {

  }

  setIntegerArray(value: number[]): boolean {

  }

  setFloatArray(value: number[]): boolean {

  }

  setDoubleArray(value: number[]): boolean {

  }

  setStringArray(value: string[]): boolean {

  }
}
