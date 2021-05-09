<script>
    export let hand_receipt;

console.log(hand_receipt);

//   <ul>
	// {#each cats as { id, name }, i}
	// 	<li><a target="_blank" href="https://www.youtube.com/watch?v={id}">
	// 		{i + 1}: {name}
	// 	</a></li>
	// {/each}
// </ul>
</script>

<table id="propertyTable">
    <thead>
      <tr>
        <td>Item Number</td>
        <td>LIN</td>
        <td>Description</td>
      </tr>
    </thead>

    <tbody>
<!-- {#each items as item,i} -->
{#each hand_receipt as {lin,mpoDesc},i}
  <tr>
    <td>{i+1}</td>
    <td>{lin}</td>
    <td>{mpoDesc}</td>
  </tr>
{/each}

    </tbody>
  </table>

  <button on:click="{()=>{localStorage.removeItem('handReceipt'); window.location.reload()}}">delete data</button>

  <style>
    #propertyTable,
    #propertyTable td{
      max-width: 800px;
      min-width: 100px;
      margin: 1rem auto;
      border: 1px solid black;
      border-collapse: collapse;
    }
    #propertyTable thead{
      font-weight: 700;
      text-align: center;
    }
  </style>