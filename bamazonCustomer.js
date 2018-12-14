const mysql = require("mysql");
const inquirer = require("inquirer");

// Create the connection
const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "bamazon"
});

// The main prompt
let customerPrompt = () => {
  // Build out a table of every product
  connection.query("SELECT * FROM products", (err, res) => {
    function Row(name, department, price, stock, sales) {
      (this.Name = name),
        (this.Department = department),
        (this.Price = price),
        (this.Stock = stock),
        (this.Sales = sales);
    }

    if (err) throw err;

    const data = {};

    for (let row of res) {
      data[row.item_id] = new Row(
        row.product_name,
        row.department_name,
        row.price,
        row.stock_quantity,
        row.product_sales
      );
    }
    console.table(data, ["Name", "Department", "Price", "Stock"]);
    // Ask the user what product they would like to purchase and how many they would like to buy
    inquirer
      .prompt([
        {
          type: "input",
          name: "itemIndex",
          message: "What is the index of the item you would like to buy?",
          validate: answer => {
            if (answer in data) {
              let valid = !isNaN(parseFloat(answer));
              return valid || "Please enter a valid index number";
            } else {
              return "This index doesn't belong to an item.";
            }
          }
        },
        {
          type: "input",
          name: "amountToBuy",
          message: "How many would you like to purchase?",
          validate: answer => {
            let valid = !isNaN(parseFloat(answer));
            return valid || "Please enter a number";
          }
        }
      ])
      // Update the product when the user purchases it
      .then(res => {
        let selectedItem = data[res.itemIndex];
        let totalCost = selectedItem.Price * parseInt(res.amountToBuy);
        if (res.amountToBuy <= selectedItem.Stock) {
          connection.query(
            `UPDATE products SET stock_quantity=${selectedItem.Stock -
              res.amountToBuy}, product_sales=${selectedItem.Sales +
              res.amountToBuy * selectedItem.Price} WHERE item_id=${
              res.itemIndex
            }`,
            (err, res) => {
              if (err) throw err;
              console.log(
                `Your order has been fulfilled for a total of: $${totalCost}`
              );
              connection.end();
            }
          );
        } else {
          console.log("Insufficient quantity!");
          connection.end();
        }
      });
  });
};

module.exports = customerPrompt;
