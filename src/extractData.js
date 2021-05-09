export async function extractData(doppedFile) {

  // TODO: add a check to make sure it was a hand receipt file dropped

  // TODO: reload page after complete
  
  cleanupFile(doppedFile);
}

 function cleanupFile(htmlContent) {
  // * Create element to hold html in order to modify/extract it
  const htmlContainer = document.createElement("div");
  htmlContainer.innerHTML = htmlContent;

  // * Consolidate all rows into one table / rid excess
  const firstTable = htmlContainer.querySelector("table");
  const allRows = htmlContainer.querySelectorAll("tr");
  allRows.forEach((tr) => firstTable.append(tr));

  // // * Remove empty Tables and empty P
  // const allChildren =  Array.from(htmlContainer.children);
  // allChildren.forEach((el) => {
  //     if (el.tagName.toLowerCase() == 'table' || el.localName.toLowerCase() == 'table') {
  //         if (el.innerText.trim() == '') {
  //             el.remove();
  //             console.log('removed one');
  //         }
  //     }
  // });
  // console.log(htmlContainer.innerText.length);
  // console.log(htmlContainer.innerHTML.length);

  // htmlContainer.querySelectorAll('p').forEach((el) => (el.innerText.trim() == '' ? (()=>{el.remove(); console.log('removed one');})() : null));
  // console.log(htmlContainer.innerText.length);
  // console.log(htmlContainer.innerHTML.length);

  collectItemData(htmlContainer);
}

 function collectItemData(itemContent) {
  // * Collect all valid data
  const trs = itemContent.querySelectorAll("tr");

  // * Basket holds info for the item that is being parsed
  let basket = [];

  // * Bucket holds all items after theyve been seperated.
  let bucket = [];

  trs.forEach((tr) => {
    // * If MPO in the row, means beginning of a new LIN
    if (tr.innerText.toLowerCase().includes("mpo")) {
      // * if basket isn't empty, move that stuff into the bucket
      if (basket.length != 0) {
        bucket.push(basket);
        basket = [];
      }
    }

    basket.push(tr);

    // * catches the last item and pushes it into the bucket
    // push last row to basket
    if (tr == trs[trs.length - 1]) {
      bucket.push(basket);
    }
  });

  //    console.log(bucket);
  cleanupItemData(bucket);
}

// function cleanupItemData(itemContent) {
//   let hrArray = itemContent.map((item) => {
//     // * itemArray will hold all text within the item
//     // * still contains description rows ie. mpo / nsn
//     let itemArray = item.map((tr) => {
//       // * for each cell in the row if empty, get rid of it
//       let row = Array.from(tr.cells).map((td) => {
//         if (td.innerText.trim() != "") {
//           return td.innerText.trim();
//         }
//       });

//       if ((!row.toString().toLowerCase().includes("rank")) && row.length != 0) {
//         return row;
//       }
//     });
//     console.log(itemArray);
//     return itemArray;
//   });
//   console.log(hrArray);
//   finalStep(hrArray);
// }

 function cleanupItemData(x) {

    let hrArray = [];
  
    x.forEach((item) => {
      let itemArray = [];
  
      item.forEach((tr) => {
        let row = [];
        let tds = Array.from(tr.cells);
  
        tds.forEach((td) => {
          let txt = td.innerText.trim();
          if (txt != '') {
            row.push(txt);
          }
        });
  
        if (!row.toString().toLowerCase().includes('rank')) {
          if (row.length != 0) {
            itemArray.push(row);
          } else {
            // * if this is not the last item, itemaray[1] wont exist because that
            // * that is the row thats currently being procssed.
            if (!itemArray[1]) {
              itemArray[1] = [null, null];
            } else {
                // ! what is this??!?
            //   console.log(itemArray[1])
            }
          }
        }
      });
      hrArray.push(itemArray);
    });
  
  
    let objectHolder = []
    hrArray.forEach(endItem => {
    let obj = buildObject(endItem);
    objectHolder.push(obj)
    });
  
    console.log('DONE')
    // console.log(objectHolder)
    saveToLocalStorage(objectHolder)
  }



function lcs(x) {
  return x.toString().toLowerCase();
}

 function finalStep(endItems) {
  let endItemJson = endItems.map(buildObject);
  console.log('end item json stuff >> ',endItemJson);
}

function scratchPaper() {
  // * throw an error if the first row doesn't include MPO
  if (!lcs(item[0]).includes("mpo")) {
    errorPopup("first row aint MPO... wassup?");
    throw new Error("first row aint MPO... wassup?");
  }
}


let ctr = 0;


 function buildObject(item) {
  let itemObj = { lin: null, mpo: null, mpoDesc: null, nsn: [], nsnDetails: [] };
  let skiplist = [];
  let nsnSerialNumberHolder = {};

  for (let i = 0; i < item.length; i++) {
    //   let rowText = item[i].toString().toLowerCase();

    // * item[i] is the row
    // * item[i][?] is the cell

    // * check if the row is already processed
    if (!skiplist.includes(i)) {
      // * if row includes 'mpo'

    //   console.log(item[i], i);

      if (lcs(item[i][0]).includes("mpo")) {
        let itemNr = item[i + 1];
        itemObj.mpo = itemNr[0] ? itemNr[0] : "N/A";
        itemObj.mpoDesc = itemNr[1] ? itemNr[1].slice(itemNr[1].indexOf(" ") + 1, itemNr[1].length) : "N/A";
        itemObj.lin = itemNr[1] ? itemNr[1].slice(0, itemNr[1].indexOf(" ")) : "N/A";
        skiplist.push(i);
        skiplist.push(i + 1);
      }

      //TODO: turn mpo/nsn into elseif
      // * if row includes 'nsn'
      if (lcs(item[i]).includes("nsn")) {
        let itemNr = item[i + 1];
        nsnSerialNumberHolder = {
          nsn: itemNr[0],
          nsnDesc: itemNr[1],
          ui: itemNr[2],
          ciic: itemNr[3],
          dla: itemNr[4],
          ohQty: itemNr[5],
          serno: [],
        };

        for (let s = i + 2; s < item.length; s++) {
            // console.log(item[s]);
            // console.log(s);
            // TODO: add splitlist check in here.  Maybe?

            let serNoRowText = item[s].toString().toLowerCase();
            if (serNoRowText.includes("mpo")) {
              break;
            } else if (serNoRowText.includes("nsn")) {
              break;
            } else if (serNoRowText.includes("sysno")) {
              // console.log('serian num contineu: sysno')
              continue;
              // * continue will break current iteration, but not the loop completly
              // * code below this will not be executed.
            } else {
              item[s].forEach((sn) => nsnSerialNumberHolder.serno.push(sn));
              skiplist.push(s);
            }
 
        }

        itemObj.nsn.push(nsnSerialNumberHolder.nsn);
        itemObj.nsnDetails.push(nsnSerialNumberHolder);
        skiplist.push(i);
        skiplist.push(i + 1);
      }
    }
  }
  return itemObj;
}


function saveToLocalStorage(endItemData){
    if(endItemData){
        console.log('got the end item data');
        console.log(endItemData);
        localStorage.setItem('handReceipt', JSON.stringify(endItemData))
    }

}