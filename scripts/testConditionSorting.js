function arrangeItemsForBottomUpGrid(pageItems) {
  const M = pageItems.length;
  if (M <= 1) return [...pageItems];

  const R = Math.ceil(M / 2);
  const domArray = new Array(M);

  for (let k = 0; k < M; k++) {
    const bRow = Math.floor(k / 2); // 0-indexed row from bottom
    const row = (R - 1) - bRow;     // 0-indexed row from top
    const col = k % 2;              // 0 = left, 1 = right

    let domIndex;
    if (M % 2 === 0) {
      domIndex = row * 2 + col;
    } else {
      if (row === 0) {
        domIndex = 0;
      } else {
        domIndex = row * 2 + col - 1;
      }
    }
    domArray[domIndex] = pageItems[k];
  }
  return domArray;
}

function assert(condition, msg) {
  if (!condition) {
    console.error("FAIL: " + msg);
    process.exit(1);
  }
  console.log("PASS: " + msg);
}

// Test 1: Even number of items (M = 4)
const itemsEven = ["C1", "C2", "C3", "C4"];
const gridEven = arrangeItemsForBottomUpGrid(itemsEven);
console.log("Grid Even (M=4):", gridEven);
assert(gridEven[2] === "C1", "Bottom left cell must be C1 (1st most recent)");
assert(gridEven[3] === "C2", "Bottom right cell must be C2 (2nd most recent)");
assert(gridEven[0] === "C3", "Top left cell must be C3 (3rd most recent)");
assert(gridEven[1] === "C4", "Top right cell must be C4 (4th most recent)");

// Test 2: Odd number of items (M = 5)
const itemsOdd = ["C1", "C2", "C3", "C4", "C5"];
const gridOdd = arrangeItemsForBottomUpGrid(itemsOdd);
console.log("Grid Odd (M=5):", gridOdd);
assert(gridOdd[3] === "C1", "Bottom left cell must be C1");
assert(gridOdd[4] === "C2", "Bottom right cell must be C2");
assert(gridOdd[1] === "C3", "Middle left cell must be C3");
assert(gridOdd[2] === "C4", "Middle right cell must be C4");
assert(gridOdd[0] === "C5", "Top left cell must be C5");

// Test 3: M = 2
const items2 = ["C1", "C2"];
const grid2 = arrangeItemsForBottomUpGrid(items2);
console.log("Grid M=2:", grid2);
assert(grid2[0] === "C1", "Bottom left must be C1");
assert(grid2[1] === "C2", "Bottom right must be C2");

// Test 4: M = 1
const items1 = ["C1"];
const grid1 = arrangeItemsForBottomUpGrid(items1);
console.log("Grid M=1:", grid1);
assert(grid1[0] === "C1", "Single item must be C1");

console.log("ALL TESTS PASSED SUCCESSFULLY!");
