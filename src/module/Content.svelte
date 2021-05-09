<script>
  import PropertyTable from "./Components/PropertyTable.svelte";
  import InputHR from "./Components/InputHR.svelte";
  import ItemView from "./Components/ItemView.svelte";

  export let hand_receipt;
</script>

<h1>Property Tracker</h1>

<ItemView />


<!-- {#if hand_receipt}
You have a hand receipt

<PropertyTable {hand_receipt} />
{:else}
<InputHR />
{/if} -->

<style>
  h1{
    margin: 1rem auto;
    max-width: 300px;
  }
</style>

<!-- <PropertyTable {...hand_receipt}/> -->