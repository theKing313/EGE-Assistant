import React, { useState } from "react";
import { API_BASE_URL } from "../../config.js";
import { authFetch } from "../../services/authService.js";

export default function PremiumModal({ onClose, onPurchased }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/billing/create-checkout`,
        {
          method: "POST",
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Оплата пока недоступна");
      }
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else if (data.mode === "development") {
        onPurchased?.(data.status);
        onClose();
      }
    } catch (purchaseError) {
      setError(purchaseError.message || "Не удалось открыть оплату");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sege-premium-overlay" onClick={onClose}>
      <div
        className="sege-premium-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="sege-premium-modal__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ✕
        </button>
        <div className="sege-premium-modal__icon">📚</div>
        <p className="sege-premium-modal__eyebrow">SmartEGE Premium</p>
        <h2 className="sege-premium-modal__title">Полный ответ</h2>
        <p className="sege-premium-modal__description">
          Правило, основные формулы и короткий похожий пример для каждого
          задания.
        </p>
        <div className="sege-premium-modal__price">
          <strong>159 ₽</strong>
          <span>в месяц</span>
        </div>
        {error && <div className="sege-premium-modal__error">{error}</div>}
        <button
          className="sege-premium-modal__purchase"
          onClick={handlePurchase}
          disabled={loading}
        >
          {loading ? "Открываем оплату..." : "Купить подписку"}
        </button>
        <p className="sege-premium-modal__note">
          Подписку можно отменить в любой момент.
        </p>
      </div>
    </div>
  );
}
