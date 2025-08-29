
import "./ItemList.css";

const items = [
  { id: 1, name: "Cappuccino", price: "₹50", image: "/images/cappuccino.jpg" },
  { id: 2, name: "Latte", price: "₹60", image: "/images/latte.jpg" },
  { id: 3, name: "Mocha", price: "₹70", image: "/images/mocha.jpg" },
  { id: 4, name: "Espresso", price: "₹40", image: "/images/espresso.jpg" },
  { id: 5, name: "Hot Chocolate", price: "₹80", image: "/images/hotchoco.jpg" },
  { id: 6, name: "Cold Coffee", price: "₹90", image: "/images/coldcoffee.jpg" },
  { id: 7, name: "Green Tea", price: "₹45", image: "/images/greentea.jpg" },
  // ... add more
];

function ItemList() {
  return (
    <div className="scroll-vertical">
      {items.map((item) => (
        <div className="card" key={item.id}>
          <img src={item.image} alt={item.name} />
          <div className="card-info">
            <h3>{item.name}</h3>
            <p>{item.price}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ItemList;
