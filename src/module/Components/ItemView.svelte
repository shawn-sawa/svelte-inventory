<script>
  let items = [
    {
      lin: 'FA20AV',
      mpo: '000198527',
      mpoDesc: 'DTCS TACTICAL RADIO,A-9695-00X,EXELIS',
      nsn: ['582001C134201'],
      nsnDetails: [
        {
          nsn: '582001C134201',
          nsnDesc: 'DTCS TACTICAL RADIO,A-9695-00X,EXELIS',
          ui: 'EA',
          ciic: 'U',
          dla: '1014',
          ohQty: '19',
          serno: [
            '969517469',
            '969517474',
            '969517475',
            '969517484',
            '969517485',
            '969517486',
            '969517488',
            '969517490',
            '969517491',
            '969517492',
            '969517493',
            '969517494',
            '969517495',
            '969517499',
            '01928',
            '01957',
            '01975',
            '02010',
            '02816',
          ],
        },
      ],
    },
    {
      lin: 'C89480',
      mpo: '000000586',
      mpoDesc: 'CAMOUFLAGE NET SYSTEM RADAR SCATTERING:',
      nsn: ['1080014572956', '1080014750696'],
      nsnDetails: [
        {
          nsn: '1080014572956',
          nsnDesc: 'CAM SYS AN/USQ-150(V)',
          ui: 'EA',
          ciic: 'J',
          dla: '0175',
          ohQty: '2',
          serno: ['4444471', '4444474'],
        },
        {
          nsn: '1080014750696',
          nsnDesc: 'CAM NET SY AN/USQ-159',
          ui: 'EA',
          ciic: 'J',
          dla: '0175',
          ohQty: '2',
          serno: ['1005407156', '1005407158'],
        },
      ],
    },
  ];
  let item = items[1];
  let nsns = item['nsnDetails'];
</script>

<div class="item-view">
  <div class="table-background">
  <table class='highlight'>
    <thead>
      <tr>
        <td colspan="3" >{item.mpoDesc}</td>
      </tr>
    </thead>
    <tbody id="hrInfo">
      <tr>
        <td>LIN</td>
        <td>{item.lin}</td>
      </tr>
      <tr>
        <td>MPO</td>
        <td>{item.mpo}</td>
      </tr>
      <tr>
        <td>MPO Description</td>
        <td>{item.mpoDesc}</td>
      </tr>
      <tr>
        <td>NSN(s)</td>
        <td>{item.nsn}</td>
      </tr>
    </tbody>
  </table>
</div>
  {#each nsns as nsn}
  <div class="table-background">
    <table style="backgroundColor: lightblue">
      <thead>
        <tr>
          <td colspan="4">{nsn.nsnDesc}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>NSN</td>
          <td id="nsn" colspan="3">{nsn.nsn}</td>
        </tr>
        <tr>
          <td>NSN Description</td>
          <td id="nsnDesc" colspan="3">{nsn.nsnDesc}</td>
        </tr>
        <tr>
          <td>TM</td>
          <td id="nsnDesc" colspan="3">TM 12-1345-134</td>
        </tr>
        <tr>
          <td>BOM</td>
          <td id="nsnDesc" colspan="">CLICK ME</td>
        </tr>
        <tr>
          <td class="spacer-row" colspan="4" />
        </tr>
        <tr>
          <td style="width:25%"><b>UI</b></td>
          <td style="width:25%"><b>CIIC</b></td>
          <td style="width:25%"><b>DLA</b></td>
          <td style="width:25%"><b>OH Qty</b></td>
        </tr>

        <tr>
          <td id="ui">{nsn.ui}</td>
          <td id="ciic">{nsn.ciic}</td>
          <td id="dla">{nsn.dla}</td>
          <td id="ohQty">{nsn.ohQty}</td>
        </tr>

        <tr>
          <td class="spacer-row"colspan="4"></td>
        </tr>

        <tr>
          <td>Serial Numbers</td>

          <td id="serno" colspan="3">
            <ul>
              {#each nsn.serno as serno}
                <!-- {nsn.serno.map(i => `<li>{i}</li>`).toString().replaceAll(',',' ')} -->
                <li>{serno}</li>
              {/each}
            </ul>
          </td>
        </tr>

        <tr style="text-align:center;">
          <td colspan="4">View COEI!</td>
        </tr>
      </tbody>
    </table>
  </div>
  {/each}
</div>

<style>
  .item-view {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  table {
    margin-bottom: 2rem;
    max-width: 800px;
  }
  thead td {
    text-align: center;
    font-size: large;
    font-weight: bold;
  }
  .spacer-row{
    background-color: black;
    height: 2px !important; 
    padding: 0;
    /* colspan="4" */
    /* column-span: all; */
  }
  .table-background{
    background-color: aqua;
    padding: 10px;
    margin: 1rem auto;
    border-radius: 5px;
    box-shadow: 0px 5px 5px steelblue;
  }
</style>
