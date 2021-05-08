<script>
  // const fileDrop = document.getElementById('fileDrop')

  const divDragOver = (e) => {
    let fileDrop = e.target;
    // let fileDrop = document.getElementById("fileDrop");
    e.target.ondragleave = () => (fileDrop.style.backgroundColor = "lightblue");
    e.target.style.backgroundColor = "red";
  };

  const newHandReceipt = (e) => {

    let fileDrop = e.target;

    if (e.dataTransfer.getData("text")) {

      console.log('text was dropped');
      console.log(e.dataTransfer.getData("text"));

    }else if(e.dataTransfer.files){

      let theText = e.dataTransfer.files[0].text();
      theText.then((x) => console.log(x));
      console.log('file was dropped');

    }else{

      console.log('i dont know what was dropped');

    }

    e.target.style.backgroundColor = "lightblue"
  };

import {testFunction} from '../test.js'

</script>

<div class="container">
  <div>
    <span>You do not have a hand receipt</span>
    <br />
    <input type="file" id="fileInput" />
  </div>

  <div id="fileDrop" on:dragover|preventDefault={divDragOver} on:drop|preventDefault={newHandReceipt}>
    drop file here
  </div>
</div>

<button on:click="{testFunction}">hello</button>

<style>
  .container {
    min-width: 100px;
    max-width: 800px;
    /* background-color: aqua; */
    margin: 1rem auto;
  }

  #fileDrop {
    background-color: lightblue;
    width: 200px;
    height: 100px;
    margin: 1rem auto;
  }
</style>


