import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import "./ui.css";

const FeedbackContext = createContext(null);

function createToast(type, title, message, duration = 3200) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    message,
    duration,
  };
}

function getDialogInitialState() {
  return {
    open: false,
    mode: "confirm",
    title: "",
    message: "",
    confirmLabel: "Подтвердить",
    cancelLabel: "Отмена",
    tone: "primary",
    required: false,
    placeholder: "",
    initialValue: "",
    resolve: null,
  };
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(getDialogInitialState);
  const [promptValue, setPromptValue] = useState("");
  const dialogInputRef = useRef(null);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const notify = ({ type = "info", title = "", message = "", duration = 3200 }) => {
    const toast = createToast(type, title, message, duration);
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => removeToast(toast.id), toast.duration);
  };

  const success = (message, title = "Готово") => notify({ type: "success", title, message });
  const error = (message, title = "Не удалось выполнить действие") =>
    notify({ type: "error", title, message });
  const info = (message, title = "Информация") => notify({ type: "info", title, message });

  const closeDialog = (result) => {
    setDialog((current) => {
      current.resolve?.(result);
      return getDialogInitialState();
    });
    setPromptValue("");
  };

  const confirm = (options) =>
    new Promise((resolve) => {
      setDialog({
        open: true,
        mode: "confirm",
        title: options?.title || "Подтвердите действие",
        message: options?.message || "",
        confirmLabel: options?.confirmLabel || "Подтвердить",
        cancelLabel: options?.cancelLabel || "Отмена",
        tone: options?.tone || "primary",
        required: false,
        placeholder: "",
        initialValue: "",
        resolve,
      });
    });

  const prompt = (options) =>
    new Promise((resolve) => {
      setPromptValue(options?.initialValue || "");
      setDialog({
        open: true,
        mode: "prompt",
        title: options?.title || "Введите значение",
        message: options?.message || "",
        confirmLabel: options?.confirmLabel || "Сохранить",
        cancelLabel: options?.cancelLabel || "Отмена",
        tone: options?.tone || "primary",
        required: Boolean(options?.required),
        placeholder: options?.placeholder || "",
        initialValue: options?.initialValue || "",
        resolve,
      });
    });

  useEffect(() => {
    if (!dialog.open || dialog.mode !== "prompt") return;
    window.setTimeout(() => dialogInputRef.current?.focus(), 0);
  }, [dialog]);

  useEffect(() => {
    if (!dialog.open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDialog(dialog.mode === "prompt" ? null : false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog]);

  const value = useMemo(
    () => ({
      notify,
      success,
      error,
      info,
      confirm,
      prompt,
    }),
    []
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-toast app-toast-${toast.type}`}>
            <div className="app-toast-icon">
              <Icon
                name={
                  toast.type === "success"
                    ? "check_circle"
                    : toast.type === "error"
                    ? "error"
                    : "info"
                }
              />
            </div>
            <div className="app-toast-body">
              {toast.title ? <strong>{toast.title}</strong> : null}
              {toast.message ? <span>{toast.message}</span> : null}
            </div>
            <button type="button" className="app-icon-button" onClick={() => removeToast(toast.id)}>
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>

      {dialog.open ? (
        <div className="app-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeDialog(dialog.mode === "prompt" ? null : false)}>
          <div className="app-dialog-surface" onMouseDown={(event) => event.stopPropagation()}>
            <div className="app-dialog-header">
              <div>
                <h3>{dialog.title}</h3>
                {dialog.message ? <p>{dialog.message}</p> : null}
              </div>
              <button
                type="button"
                className="app-icon-button"
                onClick={() => closeDialog(dialog.mode === "prompt" ? null : false)}
              >
                <Icon name="close" />
              </button>
            </div>

            {dialog.mode === "prompt" ? (
              <div className="app-dialog-body">
                <input
                  ref={dialogInputRef}
                  className="input-control"
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  placeholder={dialog.placeholder}
                />
              </div>
            ) : null}

            <div className="app-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => closeDialog(dialog.mode === "prompt" ? null : false)}>
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`}
                onClick={() => closeDialog(dialog.mode === "prompt" ? promptValue.trim() : true)}
                disabled={dialog.mode === "prompt" && dialog.required && !promptValue.trim()}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback must be used inside FeedbackProvider");
  }

  return context;
}
