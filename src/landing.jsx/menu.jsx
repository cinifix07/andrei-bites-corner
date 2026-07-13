import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import logo from "../assets/OFFICAL-LOGO.png";
import "./menu.css";

const categoryOrder = ["BURGERS", "SNACKS", "PIZZA", "DRINKS", "SHAKES", "FRIES"];

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Unable to read proof of payment."));
    reader.readAsDataURL(file);
  });
}

function MenuCard({ item, isAdded, onAdd }) {
  return (
    <article className="menu-card">
      <div className="menu-card-image">
        <img alt={item.title} src={item.image} />
        {item.badge ? <span className="menu-badge">{item.badge}</span> : null}
      </div>

      <div className="menu-card-body">
        <div className="menu-card-top">
          <h3>{item.title}</h3>
          <span className="menu-price">{item.priceLabel}</span>
        </div>

        <p className="menu-description">{item.description}</p>

        <div className="menu-card-bottom">
          <div className="menu-tags">
            {item.tags.map((tag) => (
              <span className="menu-tag secondary" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <button className={`menu-add-button ${isAdded ? "is-added" : ""}`} onClick={() => onAdd(item.id)} type="button">
            <span className="material-symbols-outlined">{isAdded ? "check" : "add_shopping_cart"}</span>
            {isAdded ? "Added!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Menu() {
  const productRecords = useQuery(api.addproduct.list);
  const createOrder = useMutation(api.orders.create);
  const generateProofUploadUrl = useMutation(api.orders.generateProofUploadUrl);
  const uploadProofOfPayment = useAction(api.orders.uploadProofOfPayment);
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [addedItems, setAddedItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    receipt: null,
  });

  const menuItems = useMemo(
    () =>
      (productRecords ?? [])
        .filter((product) => product.stock > 0)
        .map((product) => ({
          id: product._id,
          title: product.name,
          price: product.price,
          priceLabel: currencyFormatter.format(product.price),
          description: `${product.stock} ${product.stock === 1 ? "item" : "items"} available`,
          image: product.imageUrl || logo,
          category: product.category?.toUpperCase() || "UNCATEGORIZED",
          stock: product.stock,
          badge: product.stock <= 10 ? "Limited Stock" : null,
          tags: [product.category || "Uncategorized"],
        })),
    [productRecords],
  );

  const categories = useMemo(() => {
    const productCategories = [...new Set(menuItems.map((item) => item.category))];
    const sortedCategories = [
      ...categoryOrder.filter((category) => productCategories.includes(category)),
      ...productCategories.filter((category) => !categoryOrder.includes(category)).sort(),
    ];

    return ["All Items", ...sortedCategories];
  }, [menuItems]);

  const visibleSections = useMemo(() => {
    const nextActiveCategory = categories.includes(activeCategory) ? activeCategory : "All Items";
    const sections = categories
      .filter((category) => category !== "All Items")
      .map((category) => ({
        title: category,
        items: menuItems.filter((item) => item.category === category),
      }))
      .filter((section) => section.items.length > 0);

    if (nextActiveCategory === "All Items") {
      return sections;
    }

    return sections.filter((section) => section.title === nextActiveCategory);
  }, [activeCategory, categories, menuItems]);

  const cartDetails = useMemo(
    () =>
      cartItems
        .map((cartItem) => {
          const menuItem = menuItems.find((item) => item.id === cartItem.id);

          if (!menuItem) {
            return null;
          }

          const quantity = Math.min(cartItem.quantity, menuItem.stock);

          return {
            ...menuItem,
            quantity,
            subtotal: menuItem.price * quantity,
          };
        })
        .filter(Boolean),
    [cartItems, menuItems],
  );

  const cartTotal = useMemo(
    () => cartDetails.reduce((total, item) => total + item.subtotal, 0),
    [cartDetails],
  );
  const requiredPayment = cartTotal * 0.3;
  const pickupBalance = cartTotal - requiredPayment;
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const handleAddToCart = (itemId) => {
    const menuItem = menuItems.find((item) => item.id === itemId);

    if (!menuItem || menuItem.stock <= 0) {
      return;
    }

    setAddedItems((currentItems) => (currentItems.includes(itemId) ? currentItems : [...currentItems, itemId]));
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === itemId);

      if (existingItem) {
        if (existingItem.quantity >= menuItem.stock) {
          return currentItems;
        }

        return currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...currentItems, { id: itemId, quantity: 1 }];
    });

    window.setTimeout(() => {
      setAddedItems((currentItems) => currentItems.filter((id) => id !== itemId));
    }, 1800);
  };

  const handleCartQuantity = (itemId, change) => {
    const menuItem = menuItems.find((item) => item.id === itemId);

    setCartItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return { ...item, quantity: Math.min(Math.max(item.quantity + change, 0), menuItem?.stock ?? item.quantity) };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleConfirmOrder = () => {
    setOrderMessage("");
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCustomerInfoChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phoneNumber" ? value.replace(/\D/g, "") : value;

    setCustomerInfo((currentInfo) => ({ ...currentInfo, [name]: nextValue }));
  };

  const handleReceiptChange = (event) => {
    setCustomerInfo((currentInfo) => ({
      ...currentInfo,
      receipt: event.target.files?.[0] ?? null,
    }));
  };

  const handleOrderNow = async (event) => {
    event.preventDefault();

    if (!customerInfo.receipt || cartDetails.length === 0) {
      setOrderMessage("Please complete your order details and upload proof of payment.");
      return;
    }

    setIsSubmittingOrder(true);
    setOrderMessage("Uploading proof of payment...");

    try {
      const orderName = `${customerInfo.firstName.trim()}-${customerInfo.lastName.trim()}`.replace(/\s+/g, "-");
      const proofFileName = `${orderName}-${Date.now()}-${customerInfo.receipt.name}`;
      const proofUpload = {
        proofOfPaymentPath: proofFileName,
      };

      try {
        const uploadedProof = await uploadProofOfPayment({
          fileBase64: await fileToBase64(customerInfo.receipt),
          fileName: proofFileName,
          mimeType: customerInfo.receipt.type,
        });

        proofUpload.proofOfPaymentPath = uploadedProof.path;
        proofUpload.proofOfPaymentUrl = uploadedProof.path;
      } catch (uploadError) {
        const uploadUrl = await generateProofUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": customerInfo.receipt.type },
          body: customerInfo.receipt,
        });

        if (!uploadResponse.ok) {
          throw new Error("Unable to upload proof of payment.", { cause: uploadError });
        }

        const { storageId } = await uploadResponse.json();
        proofUpload.proofOfPaymentStorageId = storageId;
      }

      setOrderMessage("Saving your order...");
      await createOrder({
        firstName: customerInfo.firstName.trim(),
        lastName: customerInfo.lastName.trim(),
        phoneNumber: customerInfo.phoneNumber.trim(),
        ...proofUpload,
        items: cartDetails.map(({ id, title, price, quantity, subtotal }) => ({ id, title, price, quantity, subtotal })),
        totalAmount: cartTotal,
        requiredPayment,
        pickupBalance,
      });

      setCartItems([]);
      setCustomerInfo({ firstName: "", lastName: "", phoneNumber: "", receipt: null });
      setOrderMessage("");
      setIsCheckoutOpen(false);
      setIsOrderSuccessOpen(true);
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : "Unable to save your order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="menu-page">
      <header className="menu-topbar">
        <nav className="menu-nav menu-shell">
          <a className="menu-brand" href="#menu-top">
            Andrei Bites Corner
          </a>

          <div className="menu-actions">
            <button className="menu-icon-button" onClick={() => setIsCartOpen(true)} type="button" aria-label="Open cart">
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 ? <span className="menu-header-count">{cartCount}</span> : null}
            </button>
          </div>
        </nav>
      </header>

      <main className="menu-main" id="menu-top">
        <section className="menu-filter-bar" aria-label="Menu category filters">
          <div className="menu-shell">
            <div className="menu-filter-list">
              {categories.map((category) => (
                <button
                  className={`menu-filter ${activeCategory === category ? "is-active" : ""}`}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="menu-shell" aria-label="Menu items">
          {productRecords === undefined ? <p className="menu-empty-state">Loading menu...</p> : null}
          {productRecords !== undefined && menuItems.length === 0 ? <p className="menu-empty-state">No available products yet.</p> : null}
          {visibleSections.map((section) => (
            <div className="menu-section" key={section.title}>
              <div className="menu-section-heading">
                <h2>{section.title}</h2>
                <span />
              </div>

              <div className="menu-grid">
                {section.items.map((item) => (
                  <MenuCard
                    isAdded={addedItems.includes(item.id)}
                    item={item}
                    key={item.id}
                    onAdd={handleAddToCart}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="menu-footer">
        <p>&copy; 2026 Andrei Bites Corner. All rights reserved. | Developed CINIFIX Technology</p>
      </footer>

      <div className="menu-cart-fab">
        <button className="menu-cart-button" onClick={() => setIsCartOpen(true)} type="button" aria-label="View cart">
          <span className="material-symbols-outlined">shopping_basket</span>
          <span className="menu-cart-text">VIEW CART</span>
          {cartCount > 0 ? <span className="menu-cart-count">{cartCount}</span> : null}
        </button>
      </div>

      {isCartOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <button className="order-modal-close" onClick={() => setIsCartOpen(false)} type="button" aria-label="Close cart">
              <span className="material-symbols-outlined">close</span>
            </button>

            <p className="order-modal-kicker">ORDERING</p>
            <h2 id="order-modal-title">Your Cart</h2>

            {cartDetails.length > 0 ? (
              <>
                <div className="order-items">
                  {cartDetails.map((item) => (
                    <article className="order-item" key={item.id}>
                      <img alt={item.title} src={item.image} />
                      <div className="order-item-info">
                        <h3>{item.title}</h3>
                        <p>
                          {currencyFormatter.format(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="order-item-controls">
                        <div className="order-quantity-controls" aria-label={`${item.title} quantity controls`}>
                          <button onClick={() => handleCartQuantity(item.id, -1)} type="button" aria-label={`Remove one ${item.title}`}>
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => handleCartQuantity(item.id, 1)} type="button" aria-label={`Add one ${item.title}`}>
                            +
                          </button>
                        </div>
                        <strong>{currencyFormatter.format(item.subtotal)}</strong>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="order-summary">
                  <div>
                    <span>Total</span>
                    <strong>{currencyFormatter.format(cartTotal)}</strong>
                  </div>
                  <div className="order-summary-highlight">
                    <span>Required 30% Down Payment</span>
                    <strong>{currencyFormatter.format(requiredPayment)}</strong>
                  </div>
                  <div>
                    <span>Balance Upon Pickup</span>
                    <strong>{currencyFormatter.format(pickupBalance)}</strong>
                  </div>
                </div>

                <button className="order-checkout-button" onClick={handleConfirmOrder} type="button">
                  Confirm Order
                </button>
              </>
            ) : (
              <div className="order-empty">
                <span className="material-symbols-outlined">shopping_basket</span>
                <h3>Your cart is empty</h3>
                <p>Add menu items first to calculate the required 30% down payment.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isCheckoutOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
            <button
              className="order-modal-close"
              disabled={isSubmittingOrder}
              onClick={() => setIsCheckoutOpen(false)}
              type="button"
              aria-label="Close checkout"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <p className="order-modal-kicker">PAYMENT DETAILS</p>
            <h2 id="checkout-modal-title">Complete Your Order</h2>

            <form className="checkout-form" onSubmit={handleOrderNow}>
              <div className="checkout-field-grid">
                <label>
                  <span>First Name</span>
                  <input
                    name="firstName"
                    onChange={handleCustomerInfoChange}
                    required
                    type="text"
                    value={customerInfo.firstName}
                  />
                </label>

                <label>
                  <span>Last Name</span>
                  <input
                    name="lastName"
                    onChange={handleCustomerInfoChange}
                    required
                    type="text"
                    value={customerInfo.lastName}
                  />
                </label>
              </div>

              <label>
                <span>Phone Number</span>
                <input
                  inputMode="numeric"
                  name="phoneNumber"
                  onChange={handleCustomerInfoChange}
                  pattern="[0-9]*"
                  required
                  type="text"
                  value={customerInfo.phoneNumber}
                />
              </label>

              <div className="gcash-card">
                <p className="gcash-title">This GCASH to send your payment</p>
                <div>
                  <strong>GCASH 1</strong>
                  <span>GCASH NO. 0981-518-2668</span>
                  <span>GCASH Name. E* LO**E U*</span>
                </div>
                <p>
                  Required payment: <strong>{currencyFormatter.format(requiredPayment)}</strong>
                </p>
              </div>

              <label className="receipt-upload">
                <span>Upload screenshot of your GCASH receipt as proof of payment.</span>
                <input accept="image/*" name="receipt" onChange={handleReceiptChange} required type="file" />
                {customerInfo.receipt ? <small>{customerInfo.receipt.name}</small> : null}
              </label>

              {orderMessage ? <p className="checkout-message" role="status">{orderMessage}</p> : null}

              <button className="order-checkout-button" disabled={isSubmittingOrder} type="submit">
                {isSubmittingOrder ? "SUBMITTING..." : "ORDER NOW"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {isOrderSuccessOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="order-success-modal" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
            <div className="order-success-icon" aria-hidden="true">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <p className="order-modal-kicker">ORDER SUCCESS</p>
            <h2 id="order-success-title">Your order is now successful</h2>
            <p>
              Your order is ready to pick up at <strong>ANDREI BITES CORNER</strong>. Please bring your payment
              receipt when you claim your order.
            </p>
            <button className="order-checkout-button" onClick={() => setIsOrderSuccessOpen(false)} type="button">
              DONE
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default Menu;
