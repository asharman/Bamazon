const mysql = require("mysql");
const inquirer = require("inquirer");

const connection = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "bamazon"
});

let continuePrompt = () => {
  inquirer
    .prompt([
      {
        type: "confirm",
        name: "continue",
        message: "Would you like to do something else?"
      }
    ])
    .then(res => {
      if (res.continue) {
        managerPrompt();
      } else {
        connection.end();
      }
    });
};

let buildTable = (err, res) => {
  function Row(name, department, price, stock) {
    (this.Name = name),
      (this.Department = department),
      (this.Price = price),
      (this.Stock = stock);
  }

  if (err) throw err;

  const data = {};

  for (let row of res) {
    data[row.item_id] = new Row(
      row.product_name,
      row.department_name,
      row.price,
      row.stock_quantity
    );
  }
  console.table(data);
  return data;
};

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
          "Add New Product"
        ]
      }
    ])
    .then(res => {
      if (res.managerOptions === "View Products for Sale") {
        connection.query("SELECT * FROM products", (err, res) => {
          buildTable(err, res);
          continuePrompt();
        });
      } else if (res.managerOptions === "View Low Inventory") {
        connection.query(
          "SELECT * FROM products WHERE stock_quantity<5",
          (err, res) => {
            buildTable(err, res);
            continuePrompt();
          }
        );
      } else if (res.managerOptions === "Add to Inventory") {
        connection.query("SELECT * FROM products", (err, res) => {
          let data = buildTable(err, res);
          inquirer
            .prompt([
              {
                type: "input",
                name: "itemIndex",
                message: "What is the index of item would you like to restock?",
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
      } else if (res.managerOptions === "Add New Product") {
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
              message: "What is the name of the product you would like to add?"
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
      }
    });
};

managerPrompt();
