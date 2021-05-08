<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  const showSomething = () => {
    dispatch(showsomething);
  };
</script>

<header id="header">
  <button on:click={showSomething}>test</button>
  <button onclick="buildTable(property)">Home</button>
  <button onclick="popUp('Insert a HTML version of your Hand Receipt')">New Hand Receipt</button>

  <div id="searchBox">
    <label for="search">Search:</label>
    <input type="text" id="search" name="search" />
  </div>
</header>

<style>
  header {
    display: flex;

    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
    height: 4em;
    background-color: cadetblue;
    margin-bottom: 1em;
  }
  header button {
    border: none;
    outline: none;
    cursor: pointer;
    padding: 5px 15px;
    transition: 0.1s;
    font-size: 17px;
    margin-left: 2rem;
  }
  header button:hover {
    background-color: #ddd;
  }

  #searchBox {
    margin-left: auto;
    margin-right: 2em;
    /* justify-self : flex-end ; */
    /* align-self: auto  */
    /* | flex-start | flex-end | center | baseline | stretch; */
  }
</style>
