

<script>
const fileDrop = document.getElementById('fileDrop')

  const newHandReceipt = (e) => {
    console.log(e);
  };

</script>

<div class="container">
  <div>
    <span>You do not have a hand receipt</span>
    <br />
    <input type="file" id="fileInput" />
  </div>

  <div id="fileDrop" 
    on:dragover|preventDefault={newHandReceipt}
    on:dragover|preventDefault={newHandReceipt}
  >
    drop file here
  </div>
</div>

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
