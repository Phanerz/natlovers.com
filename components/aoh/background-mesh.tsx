"use client";

export function BackgroundMesh() {
  return (
    <div className="aoh-mesh" aria-hidden="true">
      <div
        className="aoh-blob aoh-blob-1"
        style={{
          top: "-10%",
          left: "-8%",
          width: "60vmax",
          height: "60vmax",
          background: "radial-gradient(circle, rgba(217,167,92,0.55), rgba(217,167,92,0) 70%)"
        }}
      />
      <div
        className="aoh-blob aoh-blob-2"
        style={{
          bottom: "-15%",
          right: "-10%",
          width: "55vmax",
          height: "55vmax",
          background: "radial-gradient(circle, rgba(90,120,160,0.5), rgba(90,120,160,0) 70%)"
        }}
      />
      <div
        className="aoh-blob aoh-blob-3"
        style={{
          top: "35%",
          left: "40%",
          width: "45vmax",
          height: "45vmax",
          background: "radial-gradient(circle, rgba(150,90,110,0.4), rgba(150,90,110,0) 70%)"
        }}
      />
    </div>
  );
}
