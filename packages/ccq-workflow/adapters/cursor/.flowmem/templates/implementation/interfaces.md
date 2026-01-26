---
created_at: "{timestamp}"
created_by: "Planner"
type: "interfaces"
---

# 接口与数据结构定义

## 概述

[描述这些接口/数据结构的用途]

## 核心接口

### [接口1名称]

```typescript
/**
 * [接口描述]
 */
interface [InterfaceName] {
  /** [字段描述] */
  field1: string;

  /** [字段描述] */
  field2: number;

  /** [字段描述] - 可选 */
  field3?: boolean;
}
```

### [接口2名称]

```typescript
/**
 * [接口描述]
 */
interface [InterfaceName] {
  // ...
}
```

## 数据类型

### [类型1名称]

```typescript
/**
 * [类型描述]
 */
type [TypeName] = 'value1' | 'value2' | 'value3';
```

### [类型2名称]

```typescript
/**
 * [类型描述]
 */
type [TypeName] = {
  // ...
};
```

## API 接口

### [API 1]

```typescript
/**
 * [API 描述]
 *
 * @method POST
 * @path /api/xxx
 */
interface [ApiName]Request {
  // 请求参数
}

interface [ApiName]Response {
  // 响应数据
}
```

### [API 2]

```typescript
/**
 * [API 描述]
 */
// ...
```

## 配置结构

```typescript
/**
 * 配置文件结构
 */
interface Config {
  // ...
}
```

## 枚举定义

```typescript
/**
 * [枚举描述]
 */
enum [EnumName] {
  Value1 = 'value1',
  Value2 = 'value2',
}
```

## 常量定义

```typescript
/**
 * [常量描述]
 */
const CONSTANTS = {
  MAX_RETRY: 3,
  TIMEOUT: 5000,
  // ...
};
```

## 依赖关系

```
[Interface1]
    ↓ 使用
[Interface2] ← [Interface3]
    ↓ 继承
[Interface4]
```

## 注意事项

- [注意点1]
- [注意点2]
