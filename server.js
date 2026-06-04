const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const ADMIN_USERNAME = "dad";
const ADMIN_PASSWORD = "customshoes";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

function getShoes() {
  return JSON.parse(fs.readFileSync("./data/shoes.json"));
}

function saveShoes(shoes) {
  fs.writeFileSync("./data/shoes.json", JSON.stringify(shoes, null, 2));
}

app.get("/", (req, res) => {
  const shoes = getShoes();
  res.render("index", { shoes });
});

app.get("/admin", (req, res) => {
  res.render("admin", {
    loggedIn: false,
    error: null,
    shoes: []
  });
});

app.post("/admin", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {
    const shoes = getShoes();

    res.render("admin", {
      loggedIn: true,
      error: null,
      shoes
    });
  } else {
    res.render("admin", {
      loggedIn: false,
      error: "Invalid Login",
      shoes: []
    });
  }
});

app.post("/upload", upload.single("image"), (req, res) => {
  const shoes = getShoes();

  shoes.push({
    id: Date.now(),
    title: req.body.title,
    description: req.body.description,
    image: req.file.filename
  });

  saveShoes(shoes);

  res.redirect("/");
});

app.post("/delete/:id", (req, res) => {
  let shoes = getShoes();

  const shoe = shoes.find(
    s => s.id == req.params.id
  );

  if (shoe) {
    const filePath =
      "./public/uploads/" + shoe.image;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    shoes = shoes.filter(
      s => s.id != req.params.id
    );

    saveShoes(shoes);
  }

  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});