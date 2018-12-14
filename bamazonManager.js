const mysql = require("mysql");
const inquirer = require("inquirer");

// Connect to database
const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "bamazon"
});

// The main function that gets exported
const bamazonManager = () => {
  // The function that asks if the user would like to make another action
  let continuePrompt = () => {
    inquirer
      .prompt([
        {
          type: "confirm",
          name: "continue",
          message: "Would you like to do something else?"
        }
      ])
      // If yes, then run through the main prompt again
      .then(res => {
        if (res.continue) {
          managerPrompt();
          // Otherwise end the connection
        } else {
          connection.end();
        }
      });
  };

  // Take in the data from the query and build out the table to display
  let buildTable = (err, res) => {
    // A constructor function to build out each row of the table
    function Row(name, department, price, stock, sales) {
      (this.Name = name),
        (this.Department = department),
        (this.Price = price),
        (this.Stock = stock),
        (this.Sales = sales);
    }

    if (err) throw err;

    // The empty object that gets filled with the Row objects
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
    // Display the table
    console.table(data, ["Name", "Department", "Price", "Stock"]);
    // Return the data object so that it can be saved in a variable for later use
    return data;
  };

  // The main prompt that gets called
  let managerPrompt = () => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "managerOptions",
          message: "What would you like to do?",
          choices: [
            "View Products for Sale",
            "View Low Inventory",
            "Add to Inventory",
            "Add New Product",
            "View Product Sales by Department"
          ]
        }
      ])
      .then(res => {
        // Switch statement to manage the actions based on whatt option is selected
        switch (res.managerOptions) {
          // Display the table of items for sale just like a customer sees
          case "View Products for Sale": {
            connection.query("SELECT * FROM products", (err, res) => {
              buildTable(err, res);
              continuePrompt();
            });
            break;
          }
          // Build out a table of items with a stock lower than 5
          case "View Low Inventory": {
            connection.query(
              "SELECT * FROM products WHERE stock_quantity<5",
              (err, res) => {
                buildTable(err, res);
                continuePrompt();
              }
            );
            break;
          }
          // Build out a table of every item and ask which item they would like to add stock to
          case "Add to Inventory": {
            connection.query("SELECT * FROM products", (err, res) => {
              let data = buildTable(err, res);
              inquirer
                .prompt([
                  {
                    type: "input",
                    name: "itemIndex",
                    message:
                      "What is the index of item would you like to restock?",
                    validate: function(answer) {
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
                    name: "quantityToAdd",
                    message: "How much stock would you like to add?",
                    validate: answer => {
                      let valid = !isNaN(parseFloat(answer));
                      return valid || "Please enter a number";
                    }
                  }
                ])
                // Update the stock of the item to it's old stock plus the number entered
                .then(res => {
                  let selectedItem = data[res.itemIndex];
                  let quantityToAdd = parseInt(res.quantityToAdd);
                  connection.query(
                    `UPDATE products SET stock_quantity=${selectedItem.Stock +
                      quantityToAdd} WHERE item_id=${res.itemIndex}`,
                    (err, res) => {
                      if (err) throw err;
                      console.log(`Successfully stocked ${selectedItem.Name}.`);
                      continuePrompt();
                    }
                  );
                });
            });
            break;
          }
          // Display a prompt that walks the user through adding a new item
          case "Add New Product": {
            let departmentList = ["Add New Department"];
            connection.query(
              "SELECT DISTINCT department_name FROM products",
              (err, res) => {
                if (err) throw err;
                // console.log(res);
                for (department of res) {
                  departmentList.push(department.department_name);
                }
              }
            );
            inquirer
              .prompt([
                {
                  type: "input",
                  name: "itemName",
                  message:
                    "What is the name of the product you would like to add?"
                },
                {
                  type: "list",
                  name: "department",
                  message: "Which department does this item belong in?",
                  choices: departmentList
                },
                {
                  type: "input",
                  name: "newDepartment",
                  message: "What is the name of the department?",
                  when: answers => {
                    return answers.department === "Add New Department";
                  }
                },
                {
                  type: "input",
                  name: "departmentOverhead",
                  message: "What is the overhead cost of this department?",
                  when: answer => {
                    return answer.newDepartment;
                  }
                },
                {
                  type: "input",
                  name: "itemPrice",
                  message: "What is the price of this item?",
                  validate: answer => {
                    let valid = !isNaN(parseFloat(answer));
                    return valid || "Please enter a number";
                  }
                },
                {
                  type: "input",
                  name: "itemStock",
                  message: "What is the initial stock?",
                  validate: answer => {
                    let valid = !isNaN(parseFloat(answer));
                    return valid || "Please enter a number";
                  }
                }
              ])
              .then(res => {
                let department;
                if (res.newDepartment) {
                  department = res.newDepartment;
                  connection.query(
                    "INSERT INTO departments (department_name, overhead) VALUES (?,?)",
                    [department, res.departmentOverhead]
                  );
                } else {
                  department = res.department;
                }
                let newItem = [
                  res.itemName,
                  department,
                  parseFloat(res.itemPrice),
                  parseInt(res.itemStock)
                ];
                connection.query(
                  "INSERT INTO products (product_name, department_name, price, stock_quantity) VALUES (?,?,?,?)",
                  newItem,
                  (err, res) => {
                    if (err) throw err;
                    console.log(`"${newItem[0]}" has been successfully added.`);
                    continuePrompt();
                  }
                );
              });
            break;
          }
          // Display the overall sales totaled up by department
          case "View Product Sales by Department": {
            connection.query(
              `select d.*, p.product_sales from departments as d left join products as p on p.department_name=d.department_name group by d.department_name order by d.department_id;`,
              (err, res) => {
                if (err) throw err;
                function Row(name, overhead, sales, profit) {
                  (this.Name = name),
                    (this.Overhead = overhead),
                    (this.Sales = sales),
                    (this.Profit = profit);
                }

                const data = {};

                for (let row of res) {
                  data[row.department_id] = new Row(
                    row.department_name,
                    row.overhead,
                    row.product_sales,
                    row.product_sales - row.overhead
                  );
                }
                console.table(data);
                continuePrompt();
              }
            );
          }
        }
      });
  };

  managerPrompt();
};

module.exports = bamazonManager;
