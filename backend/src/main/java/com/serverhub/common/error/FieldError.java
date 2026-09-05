package com.serverhub.common.error;

/** バリデーションエラーのフィールド単位の内訳（基本設計 02-api §2.4）。 */
public record FieldError(String field, String message) {}
