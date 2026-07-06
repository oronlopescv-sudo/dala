# Sistema de Mute

## Endpoints

### POST/GET /api/users/mute
Mute/unmute de um utilizador. Cada utilizador tem a sua própria lista de mutados.

**POST - Mute/Unmute**
```json
{
  "mutedId": "user_id_to_mute"
}
```

Resposta:
- Se já estava mutado: remove o mute (unmute)
- Se não estava: cria o mute

```json
{
  "message": "Utilizador mutado"
}
```

**GET - Lista de mutados**
Retorna a lista de utilizadores que foram mutados por este user.

```json
{
  "muted": [
    {
      "id": "user_id",
      "username": "username",
      "photoUrl": "url",
      "bio": "bio"
    }
  ]
}
```

## Headers necessários
```
Authorization: Bearer {JWT_TOKEN}
```

## Como funciona
- Cada utilizador tem uma lista pessoal de quem está mutado
- Quando A faz mute de B, A não vê/ouve B
- Quando B envia uma mensagem, A não a vê
- Quando B faz voice, A não o ouve
- B não sabe que foi mutado por A
- C pode continuar vendo/ouvindo B normalmente

## Implementação no Cliente
1. Obter lista de mutados: `GET /api/users/mute`
2. Ao carregar mensagens: enviar token no header `Authorization: Bearer {token}`
3. As mensagens já vêm filtradas (sem conteúdo dos mutados)
4. Para mutar: `POST /api/users/mute` com `{ mutedId: "..." }`
