import React from "react";
import * as subscriptionService from "../../services/subscriptionService.js";
import PremiumModal from "../../components/PremiumModal/PremiumModal.jsx";

export default function PremiumGate({ pricing, onPurchased }) {
  const [showModal, setShowModal] = React.useState(false);
  const label = subscriptionService.formatPremiumPrice(pricing);

  return (
    <section className="popup-section premium-gate">
      <p className="premium-gate__kicker">История, план и статистика</p>
      <p className="premium-gate__title">
        Доступно в SmartEGE Premium — {label}
      </p>
      <p className="premium-gate__text">
        Не просто получить ответ — пройти подготовку и не забыть сложные
        задания.
      </p>
      <button
        className="premium-gate__btn"
        onClick={() => setShowModal(true)}
      >
        Оформить Premium
      </button>
      {showModal && (
        <PremiumModal
          onClose={() => setShowModal(false)}
          onPurchased={onPurchased}
        />
      )}
    </section>
  );
}
