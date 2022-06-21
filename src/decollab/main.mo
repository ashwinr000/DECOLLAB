import Buffer "mo:base/Buffer";
import Map "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

actor {

  // Repository
  type Repo = {
    name: Text;
    pass: Text;
    commits: Buffer.Buffer<Commit>;
  };

  // Commit
  type Commit = {
    name: Text;
    changes: [Change];
  };

  // Change (Delta)
  type Change = {
    kind: Text;
    file: Text;
    position: Nat;
    length: Nat;
    content: Text;
  };

  // Repository storage
  let repos = Map.HashMap<Text, Repo>(0, Text.equal, Text.hash);

  // Create a new repo
  public func create(name: Text, pass: Text): async () {
    let commits = Buffer.Buffer<Commit>(50);
    let repo = {name; pass; commits};
    repos.put(name, repo);

  };

  // Lookup and return existing repo (w/ authentication)
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

  // Lookup and return commits of existing repo (w/o authentication)
  public func lookup(repoName: Text): async [Commit] {
    let repo = repos.get(repoName);
    let emptyRepo = {name = ""; pass = ""; commits = Buffer.Buffer<Commit>(50)};
    
    let newRepo : Repo = switch repo {
      case null emptyRepo;
      case (?repo) repo;
    };
    
    return newRepo.commits.toArray();
  };

  // Saves commit to repo
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
      repos.put(repoName, newRepo);
      return "Success";

    };
    return "Failure";
  };

  // Deletes existing repo
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
