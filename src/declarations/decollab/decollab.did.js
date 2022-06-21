export const idlFactory = ({ IDL }) => {
  const Change = IDL.Record({
    'content' : IDL.Text,
    'file' : IDL.Text,
    'kind' : IDL.Text,
    'length' : IDL.Nat,
    'position' : IDL.Nat,
  });
  const Commit = IDL.Record({ 'name' : IDL.Text, 'changes' : IDL.Vec(Change) });
  return IDL.Service({
    'commit' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Vec(Change)],
        [IDL.Text],
        [],
      ),
    'create' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'delete' : IDL.Func([IDL.Text, IDL.Text], [IDL.Text], []),
    'findRepo' : IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(Commit)], []),
    'lookup' : IDL.Func([IDL.Text], [IDL.Vec(Commit)], []),
  });
};
export const init = ({ IDL }) => { return []; };
