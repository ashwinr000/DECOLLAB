import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface Change {
  'content' : string,
  'file' : string,
  'kind' : string,
  'length' : bigint,
  'position' : bigint,
}
export interface Commit { 'name' : string, 'changes' : Array<Change> }
export interface _SERVICE {
  'commit' : ActorMethod<[string, string, string, Array<Change>], string>,
  'create' : ActorMethod<[string, string], undefined>,
  'delete' : ActorMethod<[string, string], string>,
  'findRepo' : ActorMethod<[string, string], Array<Commit>>,
  'lookup' : ActorMethod<[string], Array<Commit>>,
}
