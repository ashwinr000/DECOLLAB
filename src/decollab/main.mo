import Buffer "mo:base/Buffer";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

actor {

  type Repo = {
    name: Text;
    pass: Text;
    commits: Buffer.Buffer<Commit>;
  };

  type Commit = {
    name: Text;
    changes: [Change];
  };

  type Change = {
    kind: Text;
    file: Text;
    position: Nat;
    length: Nat;
    content: Text;
  };

  let repos = Map.HashMap<Text, Repo>(0, Text.equal, Text.hash);

  public func create(name: Text, pass: Text): async () {
    let commits = Buffer.Buffer<Commit>(50);
    let repo = {name; pass; commits};
    Debug.print(name);
    Debug.print(pass);
    repos.put(name, repo);
    Debug.print("Repo created");

  };

  public func findRepo(repoName: Text, pass: Text): async [Commit] {
    let repo = repos.get(repoName);
    let emptyRepo = {name = ""; pass = ""; commits = Buffer.Buffer<Commit>(50)};
    let newRepo : Repo = switch repo {
      case null emptyRepo;
      case (?repo) repo;
    };
    if (newRepo.pass == pass) {
      return newRepo.commits.toArray();
    };
    return emptyRepo.commits.toArray();
  };

  public func lookup(repoName: Text): async [Commit] {
    let repo = repos.get(repoName);
    let emptyRepo = {name = ""; pass = ""; commits = Buffer.Buffer<Commit>(50)};
    let newRepo : Repo = switch repo {
      case null emptyRepo;
      case (?repo) repo;
    };
    return newRepo.commits.toArray();
  };

  public func commit(repoName: Text, pass: Text, name: Text, changes: [Change]): async Text {
    
    let repo = repos.get(repoName);
    let emptyRepo = {name = ""; pass = ""; commits = Buffer.Buffer<Commit>(50)};

    let newRepo : Repo = switch repo {
      case null emptyRepo;
      case (?repo) repo;
    };

    if (newRepo.pass == pass) {
      let commit = {name; changes};
      newRepo.commits.add(commit);
      //Debug.print(newRepo.commits.get(0).changes[0].kind);
      repos.put(repoName, newRepo);
      return "Success";

    };
    return "Failure";
  };

  public func delete(repoName: Text, pass: Text): async Text {
    
    let repo = repos.get(repoName);
    let emptyRepo = {name = ""; pass = ""; commits = Buffer.Buffer<Commit>(50)};

    let newRepo : Repo = switch repo {
      case null emptyRepo;
      case (?repo) repo;
    };

    if (newRepo.pass == pass) {
      repos.delete(repoName);
      return "Success";
    };
    
    return "Failure";
  };




};
