<script>
  import Header from "./Header.svelte";
  import Content from "./Content.svelte";
  import Rain from "./Rain.svelte";

  // ! added hand_receiptt to allow easier testing
  export let hand_receipt;
  // let hand_receiptt = false;
</script>

<Header />

<Content hand_receipt={hand_receipt} />

<!-- <Rain /> -->



