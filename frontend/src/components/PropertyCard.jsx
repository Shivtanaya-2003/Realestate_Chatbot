export default function PropertyCard({ data }) {
  return (
    <div className="property-card shadow-sm">
      <img src={data.image} alt="property" className="property-img" />

      <div className="p-2">
        <h6 className="fw-bold">{data.title}</h6>
        <p className="small text-muted">{data.location}</p>

        <div className="fw-bold text-success">₹ {data.price}</div>
      </div>
    </div>
  );
}
