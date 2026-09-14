/// Strongly-typed network operation result hierarchy.
sealed class ApiResult<T> {
  const ApiResult();
}

/// Represents a successful HTTP 2xx response.
final class ApiSuccess<T> extends ApiResult<T> {
  final T data;
  final String? correlationId;

  const ApiSuccess(this.data, {this.correlationId});
}

/// Represents a structured semantic failure from the server (e.g. REJECTED ack, HTTP 4xx/5xx).
final class ApiFailure<T> extends ApiResult<T> {
  final String code;
  final String message;
  final bool retryable;
  final int? retryAfterMs;
  final Map<String, dynamic>? latest;
  final String? correlationId;

  const ApiFailure({
    required this.code,
    required this.message,
    this.retryable = false,
    this.retryAfterMs,
    this.latest,
    this.correlationId,
  });

  @override
  String toString() => 'ApiFailure(code: $code, message: $message, retryable: $retryable)';
}

/// Represents transport timeout, connectivity failure, or unparseable response
/// where command resolution is unknown. The commandId must be preserved.
final class ApiUnknown<T> extends ApiResult<T> {
  final String? commandId;
  final String message;
  final Object? cause;

  const ApiUnknown({
    this.commandId,
    this.message = 'Command resolution unknown due to transport timeout or network error.',
    this.cause,
  });

  @override
  String toString() => 'ApiUnknown(commandId: $commandId, message: $message)';
}
