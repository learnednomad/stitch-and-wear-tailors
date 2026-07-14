import type { Metadata } from "next";
import { MeasurementFigure } from "@/components/storefront/MeasurementFigure";
import { PrintGuideButton } from "@/components/storefront/PrintGuideButton";
import { CallToAction, PageHero, StorefrontSection } from "@/components/storefront/StorefrontBlocks";
import styles from "@/components/storefront/storefront.module.css";

export const metadata: Metadata = {
  title: "Measurements Guide",
  description: "Follow a clear step-by-step guide to take accurate body measurements for made-to-measure Nigerian clothing.",
};

const MEASUREMENTS = [
  { name: "Neck", detail: "Wrap the tape around the base of the neck where a collar naturally sits. Leave enough room for one finger." },
  { name: "Shoulder width", detail: "Measure straight across the back from one shoulder point to the other, following the natural curve." },
  { name: "Chest or bust", detail: "Pass the tape around the fullest part, keeping it level across the back and comfortably close without pulling." },
  { name: "Natural waist", detail: "Measure around the narrowest point of the torso. Relax, breathe normally and do not draw the stomach in." },
  { name: "Hips", detail: "Stand with feet together and measure around the fullest point of the seat, keeping the tape parallel to the floor." },
  { name: "Sleeve length", detail: "With the arm slightly bent, measure from the shoulder point over the elbow to the wrist bone." },
  { name: "Inseam", detail: "Measure from the top of the inner leg down to the desired trouser hem. Ask someone to help for best accuracy." },
  { name: "Outseam", detail: "Measure from the natural waist down the outside of the leg to the desired trouser hem." },
];

export default function MeasurementsGuidePage() {
  return (
    <>
      <PageHero
        eyebrow="Prepare for your fitting"
        title="How to take your measurements"
        description="Use a soft measuring tape, wear close-fitting clothes and ask someone to help. Measure twice and record the result in centimetres."
      />
      <StorefrontSection>
        <div className={styles.measurementLayout}>
          <div className={styles.measurementFigure}>
            <MeasurementFigure />
          </div>
          <div>
            <span className={styles.eyebrow}>Step-by-step guide</span>
            <h2 className={styles.bodyTitle}>Measure with ease, not tension.</h2>
            <p className={styles.bodyCopy}>
              Keep the tape flat against the body and snug enough to stay in place,
              never tight enough to compress. Stand naturally throughout.
            </p>
            <div className={styles.measurementSteps}>
              {MEASUREMENTS.map((measurement, index) => (
                <article className={styles.measurementStep} key={measurement.name}>
                  <span className={styles.measurementNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{measurement.name}</h3>
                    <p>{measurement.detail}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className={styles.measurementTip}>
              <strong>Tailor&apos;s tip:</strong> If a result falls between two marks, record the larger number.
              Your tailor can refine ease and garment fit during the consultation.
            </p>
            <div className={`${styles.heroActions} ${styles.printHidden}`}>
              <PrintGuideButton />
            </div>
          </div>
        </div>
      </StorefrontSection>
      <CallToAction
        title="Prefer a professional fitting?"
        body="Book an in-person or virtual measurement appointment with a verified tailor and begin your order with confidence."
        primaryHref="/appointments"
        primaryLabel="Book a measurement"
        secondaryHref="/design"
        secondaryLabel="Start a custom design"
      />
    </>
  );
}

