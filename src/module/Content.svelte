<script>
  import PropertyTable from './Components/PropertyTable.svelte';
  import InputHR from './Components/InputHR.svelte';
  import ItemView from './Components/ItemView.svelte';

  export let hand_receipt;
</script>

<h1>Property Tracker</h1>

<ItemView />



<!-- <PropertyTable {...hand_receipt}/> -->

<!-- {#if hand_receipt}
You have a hand receipt

<PropertyTable {hand_receipt} />
{:else}
<InputHR />
{/if} -->


<style>
  h1 {
    margin: 1rem auto 5rem auto;
    width: max-content;
  }
</style>
