import { decollab } from "../../declarations/decollab";
import DiffMatchPatch from 'diff-match-patch';


var deleteModal = new bootstrap.Modal(document.getElementById('deleteRepoModal'), {
  keyboard: false
})

var loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'), {
  keyboard: false
})

var findModal = new bootstrap.Modal(document.getElementById('findRepoModal'), {
  keyboard: false
})

var createModal = new bootstrap.Modal(document.getElementById('createRepoModal'), {
  keyboard: false
})

var commitModal = new bootstrap.Modal(document.getElementById('commitModal'), {
  keyboard: false
})


var homeModal = new bootstrap.Modal(document.getElementById('homeModal'), {
  keyboard: false
})

document.getElementById("repo").classList.add("d-none");


document.getElementById("goHome").addEventListener("click", () => {
  document.getElementById("home-div").classList.remove("d-none");
  document.getElementById("repo").classList.add("d-none");
})

document.getElementById("sendToCommit").addEventListener("click", () => {
  document.getElementById("commit").click();
})



function parseChanges(oldCodeFiles, newCodeFiles) {
  const dmp = new DiffMatchPatch();
  var changes = [];
  for (const [key, value] of Object.entries(oldCodeFiles)) {
    var oldCode = value;
    if (key in newCodeFiles) {
      var newCode = newCodeFiles[key];

      const diff = dmp.diff_main(oldCode, newCode);
      var char = 0;
      for (var i = 0; i < diff.length; i++) {
        if (diff[i][0] == 1) {
          changes.push({"kind": "insertion", "file": key, "position": char, "length": diff[i][1].length, "content": diff[i][1]})
        }
        if (diff[i][0] == -1) {
          changes.push({"kind": "deletion", "file": key, "position": char, "length": diff[i][1].length, "content": diff[i][1]})
        }
        if (diff[i][0] == 1 || diff[i][0] == 0) {
          char += diff[i][1].length;
        }
          
      }
    } else {
      changes.push({"kind": "deleteFile", "file": key, "position": 0, "length": 0, "content": ""});
    }
  }
  for (const [key, value] of Object.entries(newCodeFiles)) {
    if (!(key in oldCodeFiles)) {
      changes.push({"kind": "newFile", "file": key, "position": 0, "length": 0, "content": ""});
      if (value != "") {
        changes.push({"kind": "insertion", "file": key, "position": 0, "length": value.length, "content": value});
      }
    }
  }
  return changes;
}

function compileChanges(text1, changes) {
  var newText = text1;
  for (var i = 0; i < changes.length; i++) {
    const pos = Number(changes[i]["position"]);
    const len = Number(changes[i]["length"]);
    if (changes[i]["kind"] == "insertion") {
      newText = newText.slice(0, pos) + changes[i]["content"] + newText.slice(pos);
    }
    if (changes[i]["kind"] == "deletion") {
      newText = newText.slice(0, pos) + newText.slice(pos + len);
    }
  }
  return newText;
}

async function pullChanges(repoName, password) {
  const commits = await decollab.findRepo(repoName, password);
  if (commits.length == 0)  {
    return [];
  }
  var changes = [];
  document.getElementById("commitList").innerHTML = '';
  for (var i = 0; i < commits.length; i++) {
    changes = changes.concat(commits[i]["changes"]);

    
    var commitListItem = document.createElement("li");
    var commitName = document.createElement("p");
    commitName.style.display = "inline";
    commitName.innerHTML = commits[i]["name"];
    var commitView = document.createElement("button");
    commitView.style.float = "right";
    commitView.classList.add("btn");
    commitView.classList.add("btn-primary");
    commitView.innerHTML = "View";
    commitView.classList.add("commitViewButton");
    commitView.addEventListener("click", async (e) => {
      
      const openFile = localStorage.getItem("currentFile");
      const newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
      newCodeFiles[openFile] = editor.getValue();
      localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));
      
      const commitName = e.target.parentElement.childNodes[0].innerHTML;
      await viewCommit(document.getElementById("displayRepoName").innerText, commitName);
    })
    commitListItem.appendChild(commitName);
    commitListItem.appendChild(commitView);
    commitListItem.classList.add("list-group-item");
    document.getElementById("commitList").appendChild(commitListItem);    
    
  }

  var changesByFile = {};
  for (var i = 0; i < changes.length; i++) {
    const filename = changes[i]["file"];
    if (filename in changesByFile) {
      if (changes[i]["kind"] == "deleteFile") {
        delete changesByFile[filename];
      } else {
        changesByFile[filename].push(changes[i]);
      }
    } else {
      changesByFile[filename] = [];
    }
  }
  var codeFiles = {};
  document.getElementById("fileList").innerHTML = '';
  for (const [key, value] of Object.entries(changesByFile)) {
    var code = compileChanges("", value);
    codeFiles[key] = code;

    var fileListItem = document.createElement("li");
    var fileSelect = document.createElement("button");
    fileSelect.classList.add("btn");
    fileSelect.innerHTML = key;
    fileSelect.addEventListener("click", () => {
      updateFiles(key);
    })
    var fileDelete = document.createElement("button");
    fileDelete.style.float = "right";
    fileDelete.classList.add("btn");
    fileDelete.classList.add("btn-danger");
    fileDelete.innerHTML = "X";
    fileDelete.addEventListener("click", (e) => {
      deleteFile(e.target.parentElement.childNodes[0].innerHTML);
      e.target.parentElement.remove();
    })
    fileListItem.appendChild(fileSelect);
    fileListItem.appendChild(fileDelete);
    fileListItem.classList.add("list-group-item");
    document.getElementById("fileList").appendChild(fileListItem);
  }

  localStorage.setItem("oldCodeFiles", JSON.stringify(codeFiles));
  localStorage.setItem("newCodeFiles", JSON.stringify(codeFiles));

  var openFile = Object.keys(codeFiles)[0];
  localStorage.setItem("currentFile", openFile);
  

  document.getElementById("displayRepoName").innerText = repoName;  
  document.getElementById("editorTitle").innerHTML = openFile;
  document.getElementById("repo").classList.remove("d-none");
  
  editor.setValue(codeFiles[openFile]);
  editor.refresh();

  return codeFiles;

}

function commitChanges() {
  var oldCodeFiles = JSON.parse(localStorage.getItem("oldCodeFiles"));
  var newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
  var changes = parseChanges(oldCodeFiles, newCodeFiles);
  return changes;
}


async function viewCommit(repoName, commitName) {

  loadingModal.show();
  const commits = await decollab.lookup(repoName);

  var changes = [];
  var lastChanges = [];
  for (var i = 0; i < commits.length; i++) {
    if (commits[i]["name"] == commitName) {
      lastChanges = commits[i]["changes"];
      break;
    }
    changes = changes.concat(commits[i]["changes"]);
  }

  var changesByFile = {};
  for (var i = 0; i < changes.length; i++) {
    const filename = changes[i]["file"];
    if (filename in changesByFile) {
      if (changes[i]["kind"] == "deleteFile") {
        delete changesByFile[filename];
      } else {
        changesByFile[filename].push(changes[i]);
      }
    } else {
      changesByFile[filename] = [];
    }
  }

  var codeFiles = {};
  document.getElementById("fileList").innerHTML = '';
  for (const [key, value] of Object.entries(changesByFile)) {
    var code = compileChanges("", value);
    codeFiles[key] = code;

    var fileListItem = document.createElement("li");
    var fileSelect = document.createElement("button");
    fileSelect.classList.add("btn");
    fileSelect.innerHTML = key;
    fileSelect.addEventListener("click", () => {
      updateCommitView(key);
    })
    fileListItem.appendChild(fileSelect);
    fileListItem.classList.add("list-group-item");
    document.getElementById("fileList").appendChild(fileListItem);
  }

  for (var i = 0; i < lastChanges.length; i++) {
    var pos = Number(lastChanges[i]["position"]);
    const len = Number(lastChanges[i]["length"]);
    lastChanges[i]["position"] = pos;
    lastChanges[i]["length"] = len;

    if (lastChanges[i]["kind"] == "deleteFile") {

      var fileList = document.getElementById("fileList");
      var files = fileList.childNodes
      for (var i = 0; i < files.length; i++) {
        if (files[i].childNodes[0].innerText == lastChanges[i]["file"]) {
          files[i].style.backgroundColor = "red";
          break;
        }
      }
    }

    if (lastChanges[i]["kind"] == "newFile") {
      codeFiles[lastChanges[i]["file"]] = "";

      var fileListItem = document.createElement("li");
      var fileSelect = document.createElement("button");
      fileSelect.classList.add("btn");
      fileSelect.innerHTML = lastChanges[i]["file"];
      fileSelect.addEventListener("click", (e) => {
        updateCommitView(e.target.innerText);
      })
      fileListItem.appendChild(fileSelect);
      fileListItem.classList.add("list-group-item");
      fileListItem.style.backgroundColor = "green";
      document.getElementById("fileList").appendChild(fileListItem);
    }
    
  }

  var openFile = document.getElementById("fileList").childNodes[0].childNodes[0].innerHTML;
  localStorage.setItem("currentFile", openFile);


  localStorage.setItem("oldCommitFiles", JSON.stringify(codeFiles));
  localStorage.setItem("lastCommitChanges", JSON.stringify(lastChanges));


  updateCommitView(openFile);

  loadingModal.hide();

}


document.getElementById("find").addEventListener("click", async () => {

  const name = document.getElementById("findRepoName").value.toString();
  const pass = document.getElementById("findRepoPass").value.toString();
  
  findModal.hide();
  document.getElementById("home-div").classList.add("d-none");
  document.getElementById("second-editor").classList.add("d-none");
  loadingModal.show();

  document.getElementById("find").setAttribute("disabled", true);
  const commits = await pullChanges(name, pass);

  if (commits.length == 0) {
    loadingModal.hide();
    findModal.show();
    document.getElementById("findWrongPassword").innerHTML = "Incorrect password/repository does not exist";
    document.getElementById("home-div").classList.remove("d-none");
    
  }

  document.getElementById("find").removeAttribute("disabled");
  loadingModal.hide();
});


document.getElementById("deleteRepo").addEventListener("click", async () => {

  const name = document.getElementById("displayRepoName").innerHTML;
  const pass = document.getElementById("deleteRepoPass").value.toString();
  
  deleteModal.hide();
  document.getElementById("repo").classList.add("d-none");
  document.getElementById("second-editor").classList.add("d-none");
  loadingModal.show();

  document.getElementById("deleteRepo").setAttribute("disabled", true);

  const result = await decollab.delete(name, pass);


  if (result == "Failure") {
    loadingModal.hide();
    deleteModal.show();
    document.getElementById("deleteWrongPassword").innerHTML = "Incorrect password/repository does not exist";
    document.getElementById("repo").classList.remove("d-none");
    
  } else {
    document.getElementById("home-div").classList.remove("d-none");
  }
  
  document.getElementById("deleteRepo").removeAttribute("disabled");
  loadingModal.hide();

});

document.getElementById("create").addEventListener("click", async () => {

  const name = document.getElementById("createRepoName").value.toString();
  const pass = document.getElementById("createRepoPass").value.toString();
  
  createModal.hide();
  document.getElementById("home-div").classList.add("d-none");
  document.getElementById("second-editor").classList.add("d-none");
  loadingModal.show();
  
  document.getElementById("create").setAttribute("disabled", true);

  await decollab.create(name, pass);

  document.getElementById("fileList").innerHTML = "";

  localStorage.setItem("oldCodeFiles", JSON.stringify({}));
  localStorage.setItem("newCodeFiles", JSON.stringify({"welcome.txt": "Welcome!"}));
  localStorage.setItem("currentFile", "welcome.txt");


  var fileListItem = document.createElement("li");
  var fileSelect = document.createElement("button");
  fileSelect.classList.add("btn");
  fileSelect.innerHTML = "welcome.txt";
  fileSelect.addEventListener("click", () => {
    updateFiles("welcome.txt");
  })
  var fileDelete = document.createElement("button");
  fileDelete.style.float = "right";
  fileDelete.classList.add("btn");
  fileDelete.classList.add("btn-danger");
  fileDelete.innerHTML = "X";
  fileDelete.addEventListener("click", () => {
    deleteFile("welcome.txt");
    fileListItem.remove();
  })
  fileListItem.classList.add("list-group-item");
  fileListItem.appendChild(fileSelect);
  fileListItem.appendChild(fileDelete);
  document.getElementById("fileList").appendChild(fileListItem);

  document.getElementById("create").removeAttribute("disabled");

  document.getElementById("displayRepoName").innerText = name;  
  loadingModal.hide();
  document.getElementById("repo").classList.remove("d-none");
  document.getElementById("editorTitle").innerHTML = "welcome.txt";
  editor.setValue("Welcome!");
  editor.refresh();

  return false;
});


document.getElementById("commit").addEventListener("click", async () => {
  var currentFile = localStorage.getItem("currentFile");
  var newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
  newCodeFiles[currentFile] = editor.getValue();
  localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));
  var changes = commitChanges();
  localStorage.setItem("changes", JSON.stringify(changes));

  var changesByFile = {};
  for (var i = 0; i < changes.length; i++) {
    const filename = changes[i]["file"];
    if (!(filename in changesByFile)) {
      changesByFile[filename] = {"status": "Existing", "insertions": 0, "deletions": 0};
    }
    if (changes[i]["kind"] == "deleteFile") {
      changesByFile[filename] = {"status": "Deleted", "insertions": 0, "deletions": 0};
    }
    if (changes[i]["kind"] == "newFile") {
      changesByFile[filename] = {"status": "New", "insertions": 0, "deletions": 0};
    }
    if (changes[i]["kind"] == "deletion") {
      changesByFile[filename]["deletions"] += 1;
    }
    if (changes[i]["kind"] == "insertion") {
      changesByFile[filename]["insertions"] += 1;
    }
    
  }

  document.getElementById("commitChanges").innerHTML = "";

  for (const [key, value] of Object.entries(changesByFile)) {

    var changeListItem = document.createElement("li");
    var changes = document.createElement("p");
    changes.style.display = "inline";
    changes.style.fontSize = "16px"
    changes.style.float = "right";
    changeListItem.innerHTML = key;
    if (value["status"] == "Deleted") {
      changeListItem.style.backgroundColor = "red";
    } else {
      if (value["status"] == "New") {
        changeListItem.style.backgroundColor = "green";
      }
      changes.innerHTML = "+" + value["insertions"] + "    -" + value["deletions"];
    }
    
    changeListItem.appendChild(changes);
    changeListItem.classList.add("list-group-item");
    document.getElementById("commitChanges").appendChild(changeListItem);
  
  }


});


document.getElementById("push").addEventListener("click", async () => {

  commitModal.hide();
  loadingModal.show();
  const repoName = document.getElementById("displayRepoName").innerText;
  const pass = document.getElementById("commitPass").value.toString();

  const msg = document.getElementById("commitMsg").value.toString();
  
  document.getElementById("push").setAttribute("disabled", true);

  var changes = JSON.parse(localStorage.getItem("changes"));
  localStorage.setItem("oldCodeFiles", localStorage.getItem("newCodeFiles"));
  const result = await decollab.commit(repoName, pass, msg, changes);
  if (result == "Success") {

    var commitListItem = document.createElement("li");
    var commitName = document.createElement("p");
    commitName.style.display = "inline";
    commitName.innerHTML = msg;
    var commitView = document.createElement("button");
    commitView.style.float = "right";
    commitView.classList.add("btn");
    commitView.classList.add("btn-primary");
    commitView.innerHTML = "View";
    commitView.classList.add("commitViewButton");
    commitView.addEventListener("click", async (e) => {
      const openFile = localStorage.getItem("currentFile");
      const newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
      newCodeFiles[openFile] = editor.getValue();
      localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));
      
      const commitName = e.target.parentElement.childNodes[0].innerHTML;
      await viewCommit(repoName, commitName);
    })
    commitListItem.appendChild(commitName);
    commitListItem.appendChild(commitView);
    commitListItem.classList.add("list-group-item");
    document.getElementById("commitList").appendChild(commitListItem);

  } else {
    commitModal.show();
    document.getElementById("commitWrongPassword").innerHTML = "Incorrect password";
  }
  loadingModal.hide();
  document.getElementById("push").removeAttribute("disabled");
  return false;
});

document.getElementById("newFile").addEventListener("click", async () => {

  const filename = document.getElementById("filename").value.toString();
  
  document.getElementById("newFile").setAttribute("disabled", true);

  var newCodeFiles = localStorage.getItem("newCodeFiles");
  if (newCodeFiles == "") {
    newCodeFiles = {};
  } else {
    newCodeFiles = JSON.parse(newCodeFiles);
  }
  newCodeFiles[filename] = "";
  localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));


  var fileListItem = document.createElement("li");
  var fileSelect = document.createElement("button");
  fileSelect.classList.add("btn");
  fileSelect.innerHTML = filename;
  fileSelect.addEventListener("click", () => {
    updateFiles(filename);
  })
  var fileDelete = document.createElement("button");
  fileDelete.style.float = "right";
  fileDelete.classList.add("btn");
  fileDelete.classList.add("btn-danger");
  fileDelete.innerHTML = "X";
  fileDelete.addEventListener("click", () => {
    deleteFile(filename);
    fileListItem.remove();
  })
  fileListItem.classList.add("list-group-item");
  fileListItem.appendChild(fileSelect);
  fileListItem.appendChild(fileDelete);
  document.getElementById("fileList").appendChild(fileListItem);

  updateFiles(filename);


  document.getElementById("newFile").removeAttribute("disabled");


  return false;
});


document.getElementById("return").addEventListener("click", () => {
  document.getElementById("fileList").innerHTML = "";
  const newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
  for (const [key, value] of Object.entries(newCodeFiles)) {
    var fileListItem = document.createElement("li");
    var fileSelect = document.createElement("button");
    fileSelect.classList.add("btn");
    fileSelect.innerHTML = key;
    fileSelect.addEventListener("click", () => {
      updateFiles(key);
    })
    var fileDelete = document.createElement("button");
    fileDelete.style.float = "right";
    fileDelete.classList.add("btn");
    fileDelete.classList.add("btn-danger");
    fileDelete.innerHTML = "X";
    fileDelete.addEventListener("click", (e) => {
      deleteFile(e.target.parentElement.childNodes[0].innerHTML);
      e.target.parentElement.remove();
    })
    fileListItem.classList.add("list-group-item");
    fileListItem.appendChild(fileSelect);
    fileListItem.appendChild(fileDelete);
    document.getElementById("fileList").appendChild(fileListItem);
  }

  var codeViewer = document.getElementById("second-editor");
  codeViewer.classList.remove("col-3");
  codeViewer.classList.add("d-none");

  var codeEditor = document.getElementById("first-editor");
  codeEditor.classList.remove("col-3");
  codeEditor.classList.add("col-6");
  
  var openFile = Object.keys(newCodeFiles)[0];
  localStorage.setItem("currentFile", openFile);
  editor.setValue(newCodeFiles[openFile]);
  editor.setOption("readOnly", false);
  editor.refresh();

})


function updateFiles(newFilename) {
  var currentFile = localStorage.getItem("currentFile");
  var newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
  newCodeFiles[currentFile] = editor.getValue();
  var newCode = newCodeFiles[newFilename];
  
  localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));
  localStorage.setItem("currentFile", newFilename);
  document.getElementById("editorTitle").innerHTML = newFilename;
  editor.setValue(newCode);

}

function deleteFile(filename) {
  var currentFile = localStorage.getItem("currentFile");
  var newCodeFiles = JSON.parse(localStorage.getItem("newCodeFiles"));
  if (Object.keys(newCodeFiles).length > 1) {
    delete newCodeFiles[filename];
    if (currentFile == filename) {
      var openFile = Object.keys(newCodeFiles)[0];
      localStorage.setItem("currentFile", openFile);
      document.getElementById("editorTitle").innerHTML = openFile;
      editor.setValue(newCodeFiles[openFile]);
    }
    localStorage.setItem("newCodeFiles", JSON.stringify(newCodeFiles));
  } else {
    console.log("Repository must have at least one file.");
  }
}

function updateCommitView(filename) {
  var newCodeFiles = JSON.parse(localStorage.getItem("oldCommitFiles"));
  var newCode = newCodeFiles[filename];

  var lastChanges = JSON.parse(localStorage.getItem("lastCommitChanges"));

  var updatedChanges = [];
  for (var i = 0; i < lastChanges.length; i++) {

    if (lastChanges[i]["file"] == filename) {
      updatedChanges.push(lastChanges[i]);
    }
  }
  var updatedCode = compileChanges(newCode, updatedChanges);

  var codeViewer = document.getElementById("second-editor");
  codeViewer.classList.add("col-3");
  codeViewer.classList.remove("d-none");

  var codeEditor = document.getElementById("first-editor");
  codeEditor.classList.remove("col-6");
  codeEditor.classList.add("col-3");

  document.getElementById("editorTitle").innerHTML = filename + " (old)";
  editor.setValue(newCode);
  editor.setOption("readOnly", "nocursor");

  document.getElementById("viewerTitle").innerHTML = filename + " (new)";
  editor2.setValue(updatedCode);
  editor2.setOption("readOnly", "nocursor");
  editor2.refresh();

  localStorage.setItem("oldCommitFiles", JSON.stringify(newCodeFiles));
}