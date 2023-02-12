У меня задача стояла такая - я хотел иметь рандомные характеристики айтемов. Например, меч с уроном 1-2, где 1-2 это не минимальная и максимальная атаки, а рендж для генерации урона.

То есть когда игрок получал лут с этим айтемом - ему добавлялся либо меч либо с уроном 1, либо меч с уроном 2. 

Прототип (меч 1-2) определялся такой моделькой:

```cs
public interface IItemDefinition  
{  
    string ID { get; }  
    LocalizedString Title { get; }  
    LocalizedString Description { get; }  
    AssetReferenceSprite Icon { get; }  
    ItemCategory ItemCategory { get; }  
    ItemAttributeCollection ItemAttributeCollection { get; }  
}

public interface IItemAttributeCollection  
{  
    IReadOnlyList<ItemAttribute> ItemAttributes { get; }  
}
```

ItemCategory - пустой абстрактный класс, аналог enum. Не уверен в его необходимости, но пока не удалил.

Сам айтем (конкретный меч с уроном 1, например) определялся так:

```cs
public interface IItemInstance  
{  
    LocalizedString Title { get; }  
    LocalizedString Description { get; }  
    AssetReferenceSprite Icon { get; }  
    IItemDefinition ItemDefinition { get; }  
    ItemAttributeCollection ItemAttributeCollection { get; }  
}
```

ItemAttributeCollection в IItemInstance представляли собой только реальные статы, а в IItemDefinition - статы генерации + реальные статы.

Например, реальный стат:

```cs
public class HealthCombatStatAttribute : CombatStatAttribute<HealthCharacterCombatDataStat>  
{  
    public override CharacterCombatDataStatType CharacterCombatDataStatType => CharacterCombatDataStatType.Health;  
}

public abstract class CombatStatAttribute<T> : ItemAttribute, ICombatStatAttribute where T : CharacterCombatDataStat, new()  
{  
    public abstract CharacterCombatDataStatType CharacterCombatDataStatType { get; }  
  
    public T Value = null!;  
  
    public CharacterCombatDataStat CharacterCombatDataStat => Value;  
}  
```

Причем валюты тоже определялись в рамках системы как айтемы с особым атрибутом:

```cs
public class CurrencyItemAttribute : ItemAttribute
{
    public CurrencyDefinition CurrencyDefinition = null!;
}
```

А вот статы генерации:

```cs
public class HealthCombatStatRangeAttribute : CombatStatRangeAttribute<HealthCharacterCombatDataStat>  
{  
    public override CharacterCombatDataStatType CharacterCombatDataStatType => CharacterCombatDataStatType.Health;  
  
    public override ItemAttribute GetFinalVersion() => new HealthCombatStatAttribute {Value = new HealthCharacterCombatDataStat {Value = Random.Range(MinValue.Value, MaxValue.Value)}};  
}

public abstract class CombatStatRangeAttribute<T> : ItemAttribute where T : CharacterCombatDataStat  
{  
    public abstract CharacterCombatDataStatType CharacterCombatDataStatType { get; }  
  
    [JsonProperty]  
    public T MinValue = null!;  
  
    [JsonProperty]  
    public T MaxValue = null!;  
}  
```

Конвертация статов генерации ItemDefinition в реальные статы ItemInstance происходила через метод GetFinalVersion

```cs
public abstract class ItemAttribute  
{  
    public virtual ItemAttribute GetFinalVersion() => this.CloneJson();  
}
```

Иерархия данных у статов была такой:

```cs
public class HealthCharacterCombatDataStat : IntCharacterCombatDataStat  
{  
    public override CharacterCombatDataStatType CharacterCombatDataStatType => CharacterCombatDataStatType.Health;  
    public override CharacterCombatDataStat WithBonus(CharacterCombatDataStat characterCombatDataStat)  
    {        return new HealthCharacterCombatDataStat  
        {  
            Value = Value + ((HealthCharacterCombatDataStat) characterCombatDataStat)!.Value  
        };  
    }
}


public abstract class IntCharacterCombatDataStat : CharacterCombatDataStat<int>  
{  
}

public abstract class CharacterCombatDataStat<T> : CharacterCombatDataStat where T : struct  
{  
    public T Value;  
}
public abstract class CharacterCombatDataStat  
{  
    public abstract CharacterCombatDataStatType CharacterCombatDataStatType { get; }  
    public abstract CharacterCombatDataStat WithBonus(CharacterCombatDataStat value);  
}
```

С виду всё это кажется довольно сложным, но в этом есть логика. Какие-то статы типа Health задаются интом, какие-то типа CriticalMultiplier - флоатом, и могут быть замороченные типа AOEBonusDamage с интом MaxTargets и вторым интом BonusDamage.

Вся эта система мне и сейчас кажется логичной и гибкой, не нравится мне в ней только енум CharacterCombatDataStatType и абстрактные классы вместо интерфейсов. Посмотрим как это всё изменится после рефакторинга.
