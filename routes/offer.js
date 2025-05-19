const express = require("express");
const router = express.Router();
const fileupload = require("express-fileupload");
const Offer = require("../models/Offer");
const fileUpload = require("express-fileupload");
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinary = require("cloudinary");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      //console.log(req.headers.authorization);

      const { title, description, price, condition, city, brand, size, color } =
        req.body;
      //console.log(req.body);
      //console.log(req.files);

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          {
            COULEUR: color,
          },
          {
            EMPLACEMENT: city,
          },
        ],
        owner: req.user,
      });
      await newOffer.save();
      const result = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture)
      );
      newOffer.product_image = result;
      console.log(result);

      //console.log(newOffer);
      res.json(newOffer);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    const filters = {};
    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.product_price = {
        $gte: Number(req.query.priceMin),
      };
    }
    if (req.query.priceMax) {
      //filters.product_price = {
      // $lte: Number(req.query.priceMax),
      if (filters.product_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        filters.product_price = {
          $lte: Number(req.query.priceMax),
        };
      }
    }
    const sort = {};
    if (req.query.sort === "price-desc") {
      sort.product_price = -1; //"desc"
    } else if (req.query.sort === "price-asc") {
      sort.product_price = 1; //"asc"
    }
    let limit = 5;
    if (req.query.limit) {
      limit = req.query.limit;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    //10 res par page = 1) skip 0, 2) skip 10, 3) skip 20
    const skip = (page - 1) * limit;
    const results = await Offer.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const count = await Offer.countDocuments(filters);

    res.json({ count: count, offers: results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get("offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );
    res.json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
module.exports = router;
