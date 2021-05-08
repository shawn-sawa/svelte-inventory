<script>
  import PropertyTable from "./PropertyTable.svelte";
  import InputHR from "./InputHR.svelte";

  //  let db = false;
  export let hand_receipt;
</script>

<h1>hi</h1>

{#if hand_receipt}
  You have a hand receipt

  <PropertyTable />
{:else}
  <InputHR />
{/if}


<style>
  
</style>